import { Router, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/generate', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { member_name, business, code, commission_rate, campaign_id } = req.body as {
    member_name: string; business?: string; code: string;
    commission_rate: number; campaign_id?: number;
  };

  const upperCode = code.toUpperCase();

  // Check code uniqueness
  const existing = await query('SELECT id FROM promo_codes WHERE code = $1', [upperCode]);
  if (existing.length) {
    res.status(409).json({ error: 'Code already exists' });
    return;
  }

  // Create affiliate
  const affiliateRows = await query(
    'INSERT INTO affiliates (member_name, business, code, commission_rate) VALUES ($1,$2,$3,$4) RETURNING *',
    [member_name, business ?? null, upperCode, commission_rate]
  );
  const affiliate = affiliateRows[0] as { id: number };

  // Create promo code row
  const codeRows = await query(
    'INSERT INTO promo_codes (code, discount_type, affiliate_id, campaign_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [upperCode, 'percentage', affiliate.id, campaign_id ?? null]
  );

  res.status(201).json({ affiliate: affiliateRows[0], promo_code: codeRows[0] });
});

export default router;
