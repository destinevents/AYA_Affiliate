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
    const rows = await query('SELECT * FROM affiliates ORDER BY joined_at DESC');
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
