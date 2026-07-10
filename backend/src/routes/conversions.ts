import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const createSchema = z.object({
  affiliate_id: z.number().int().positive(),
  promo_code: z.string().min(1).max(20),
  buyer_action: z.string().min(1).max(200),
  sale_amount: z.number().positive(),
});

router.get('/', requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await query(`
      SELECT r.*, a.member_name, a.commission_rate
      FROM referral_conversions r
      JOIN affiliates a ON a.id = r.affiliate_id
      ORDER BY r.created_at DESC
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { affiliate_id, promo_code, buyer_action, sale_amount } = createSchema.parse(req.body);

    const affiliateRows = await query<{ commission_rate: string }>(
      'SELECT commission_rate FROM affiliates WHERE id = $1', [affiliate_id]
    );
    if (!affiliateRows.length) { res.status(404).json({ error: 'Affiliate not found' }); return; }

    const rate = parseFloat(affiliateRows[0].commission_rate);
    const commission_amount = parseFloat((sale_amount * rate / 100).toFixed(2));

    const rows = await query(
      `INSERT INTO referral_conversions
        (affiliate_id, promo_code, buyer_action, sale_amount, commission_amount)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [affiliate_id, promo_code.toUpperCase(), buyer_action, sale_amount, commission_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

router.patch('/:id/pay', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const convRows = await query<{ affiliate_id: number; commission_amount: string; status: string }>(
      'SELECT affiliate_id, commission_amount, status FROM referral_conversions WHERE id = $1', [id]
    );
    if (!convRows.length) { res.status(404).json({ error: 'Conversion not found' }); return; }
    if (convRows[0].status !== 'pending') {
      res.status(409).json({ error: `Conversion is already "${convRows[0].status}"` });
      return;
    }

    const { affiliate_id, commission_amount } = convRows[0];
    await query('UPDATE referral_conversions SET status = $1 WHERE id = $2', ['paid', id]);
    await query(
      'UPDATE affiliates SET lifetime_earned = lifetime_earned + $1 WHERE id = $2',
      [commission_amount, affiliate_id]
    );

    const updated = await query('SELECT * FROM referral_conversions WHERE id = $1', [id]);
    res.json(updated[0]);
  } catch (err) { next(err); }
});

export default router;
