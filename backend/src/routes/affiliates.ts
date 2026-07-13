import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  member_name: z.string().min(1).max(120),
  business: z.string().max(120).optional(),
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9]+$/, 'Code must be alphanumeric'),
  commission_rate: z.number().min(1).max(50),
});

router.get('/', requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await query(`
      SELECT a.*,
        COALESCE(SUM(r.commission_amount) FILTER (WHERE r.status = 'pending'), 0) AS pending_commission
      FROM affiliates a
      LEFT JOIN referral_conversions r ON r.affiliate_id = a.id
      GROUP BY a.id
      ORDER BY a.joined_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { member_name, business, code, commission_rate } = createSchema.parse(req.body);
    const rows = await query(
      'INSERT INTO affiliates (member_name, business, code, commission_rate) VALUES ($1,$2,$3,$4) RETURNING *',
      [member_name, business ?? null, code.toUpperCase(), commission_rate]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const existing = await query('SELECT id FROM affiliates WHERE id = $1', [id]);
    if (!existing.length) { res.status(404).json({ error: 'Affiliate not found' }); return; }

    const conversions = await query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM referral_conversions WHERE affiliate_id = $1', [id]
    );
    if (parseInt(conversions[0].count) > 0) {
      res.status(409).json({ error: 'This affiliate has recorded conversions and cannot be deleted — pause them instead to keep the payout history.' });
      return;
    }

    await withTransaction(async (client) => {
      await client.query('DELETE FROM promo_codes WHERE affiliate_id = $1', [id]);
      await client.query('DELETE FROM affiliates WHERE id = $1', [id]);
    });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

const updateSchema = z.object({
  member_name: z.string().min(1).max(120).optional(),
  business: z.string().max(120).nullable().optional(),
  commission_rate: z.number().min(1).max(50).optional(),
  min_payout: z.number().min(0).optional(),
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const body = updateSchema.parse(req.body);
    const sets: string[] = [];
    const vals: unknown[] = [];
    let n = 1;
    if (body.member_name !== undefined) { sets.push(`member_name = $${n++}`); vals.push(body.member_name); }
    if ('business' in body) { sets.push(`business = $${n++}`); vals.push(body.business ?? null); }
    if (body.commission_rate !== undefined) { sets.push(`commission_rate = $${n++}`); vals.push(body.commission_rate); }
    if (body.min_payout !== undefined) { sets.push(`min_payout = $${n++}`); vals.push(body.min_payout); }
    if (!sets.length) { res.status(400).json({ error: 'No fields to update' }); return; }
    vals.push(id);
    const rows = await query(`UPDATE affiliates SET ${sets.join(', ')} WHERE id = $${n} RETURNING *`, vals);
    if (!rows.length) { res.status(404).json({ error: 'Affiliate not found' }); return; }
    res.json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);
    const rows = await query<{ status: string }>('SELECT status FROM affiliates WHERE id = $1', [id]);
    if (!rows.length) { res.status(404).json({ error: 'Affiliate not found' }); return; }

    const newStatus = rows[0].status === 'active' ? 'paused' : 'active';
    const updated = await query('UPDATE affiliates SET status = $1 WHERE id = $2 RETURNING *', [newStatus, id]);
    res.json(updated[0]);
  } catch (err) { next(err); }
});

export default router;
