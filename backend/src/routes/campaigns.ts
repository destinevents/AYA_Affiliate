import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(120),
  status: z.enum(['active', 'upcoming', 'ended']).default('upcoming'),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
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
    const { name, status, start_date, end_date } = createSchema.parse(req.body);
    const rows = await query(
      'INSERT INTO affiliate_campaigns (name, status, start_date, end_date) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, status, start_date, end_date]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
