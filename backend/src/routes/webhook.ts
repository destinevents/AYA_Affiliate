import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query } from '../db/index.js';

const router = Router();

const conversionSchema = z.object({
  promo_code: z.string().min(1).max(20),
  buyer_action: z.string().min(1).max(200),
  sale_amount: z.number().positive(),
});

router.post('/conversion', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) { res.status(503).json({ error: 'Webhook not configured on server' }); return; }
    if (req.headers['x-webhook-secret'] !== secret) {
      res.status(401).json({ error: 'Invalid webhook secret' });
      return;
    }

    const { promo_code, buyer_action, sale_amount } = conversionSchema.parse(req.body);
    const upperCode = promo_code.toUpperCase();

    const codeRows = await query<{ affiliate_id: number }>(
      'SELECT affiliate_id FROM promo_codes WHERE code = $1', [upperCode]
    );
    if (!codeRows.length) {
      res.status(404).json({ error: `No affiliate found for code "${upperCode}"` });
      return;
    }

    const { affiliate_id } = codeRows[0];
    const affRows = await query<{ commission_rate: string; status: string }>(
      'SELECT commission_rate, status FROM affiliates WHERE id = $1', [affiliate_id]
    );
    if (!affRows.length || affRows[0].status !== 'active') {
      res.status(409).json({ error: 'Affiliate is not active' });
      return;
    }

    const commission_amount = parseFloat((sale_amount * parseFloat(affRows[0].commission_rate) / 100).toFixed(2));

    const rows = await query(
      `INSERT INTO referral_conversions (affiliate_id, promo_code, buyer_action, sale_amount, commission_amount)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [affiliate_id, upperCode, buyer_action, sale_amount, commission_amount]
    );
    res.status(201).json(rows[0]);
  } catch (err) { next(err); }
});

export default router;
