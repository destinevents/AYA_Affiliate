import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(['event', 'product']).default('event'),
  status: z.enum(['active', 'upcoming', 'ended']).default('upcoming'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD').optional(),
}).refine(data => data.type !== 'event' || (!!data.start_date && !!data.end_date), {
  message: 'Start and end dates are required for events',
});

router.get('/', requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await query(`
      SELECT
        c.*,
        COUNT(DISTINCT p.id)::int AS codes_linked,
        COUNT(DISTINCT r.id)::int AS conversions,
        COALESCE(SUM(CASE WHEN r.status != 'void' THEN r.sale_amount ELSE 0 END), 0) AS revenue
      FROM affiliate_campaigns c
      LEFT JOIN promo_codes p ON p.campaign_id = c.id
      LEFT JOIN referral_conversions r ON r.promo_code = p.code
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, type, status, start_date, end_date } = createSchema.parse(req.body);
    const rows = await query(
      'INSERT INTO affiliate_campaigns (name, type, status, start_date, end_date) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, type, status, start_date ?? null, end_date ?? null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const existing = await query('SELECT id FROM affiliate_campaigns WHERE id = $1', [id]);
    if (!existing.length) { res.status(404).json({ error: 'Campaign not found' }); return; }

    const conversions = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM referral_conversions r
       JOIN promo_codes p ON p.code = r.promo_code
       WHERE p.campaign_id = $1`, [id]
    );
    if (parseInt(conversions[0].count) > 0) {
      res.status(409).json({ error: 'This campaign has recorded conversions and cannot be deleted — mark it as ended instead to preserve the payout history.' });
      return;
    }

    await withTransaction(async (client) => {
      await client.query('UPDATE promo_codes SET campaign_id = NULL WHERE campaign_id = $1', [id]);
      await client.query('DELETE FROM affiliate_campaigns WHERE id = $1', [id]);
    });
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

export default router;
