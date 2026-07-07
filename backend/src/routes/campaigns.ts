import { Router, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
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
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { name, status, start_date, end_date } = req.body as {
    name: string; status: string; start_date: string; end_date: string;
  };
  const rows = await query(
    'INSERT INTO affiliate_campaigns (name, status, start_date, end_date) VALUES ($1,$2,$3,$4) RETURNING *',
    [name, status ?? 'upcoming', start_date, end_date]
  );
  res.status(201).json(rows[0]);
});

export default router;
