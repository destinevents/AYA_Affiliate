import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

const generateSchema = z.object({
  member_name: z.string().min(1).max(120),
  business: z.string().max(120).optional(),
  code: z.string().min(2).max(20).regex(/^[A-Za-z0-9]+$/, 'Code must be alphanumeric'),
  commission_rate: z.number().min(1).max(50),
  campaign_id: z.number().int().positive().optional(),
});

router.get('/', requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await query(`
      SELECT
        p.id,
        p.code,
        p.affiliate_id,
        p.campaign_id,
        a.member_name,
        a.commission_rate,
        c.name AS campaign_name
      FROM promo_codes p
      JOIN affiliates a ON a.id = p.affiliate_id
      LEFT JOIN affiliate_campaigns c ON c.id = p.campaign_id
      WHERE a.status = 'active'
      ORDER BY COALESCE(c.name, 'ZZZZ'), p.code
    `);
    res.json(rows);
  } catch (err) { next(err); }
});

router.post('/generate', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { member_name, business, code, commission_rate, campaign_id } = generateSchema.parse(req.body);
    const upperCode = code.toUpperCase();

    const existing = await query('SELECT id FROM promo_codes WHERE code = $1', [upperCode]);
    if (existing.length) {
      res.status(409).json({ error: `Code "${upperCode}" is already taken` });
      return;
    }

    const result = await withTransaction(async (client) => {
      const affiliateRows = await client.query(
        'INSERT INTO affiliates (member_name, business, code, commission_rate) VALUES ($1,$2,$3,$4) RETURNING *',
        [member_name, business ?? null, upperCode, commission_rate]
      );
      const affiliate = affiliateRows.rows[0] as { id: number };

      const codeRows = await client.query(
        'INSERT INTO promo_codes (code, discount_type, affiliate_id, campaign_id) VALUES ($1,$2,$3,$4) RETURNING *',
        [upperCode, 'percentage', affiliate.id, campaign_id ?? null]
      );

      return { affiliate: affiliateRows.rows[0], promo_code: codeRows.rows[0] };
    });

    res.status(201).json(result);
  } catch (err) { next(err); }
});

export default router;
