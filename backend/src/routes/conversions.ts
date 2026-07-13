import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../db/index.js';
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

router.post('/pay-all', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { affiliate_id } = z.object({ affiliate_id: z.number().int().positive() }).parse(req.body);

    const affRows = await query<{ min_payout: string }>(
      'SELECT min_payout FROM affiliates WHERE id = $1', [affiliate_id]
    );
    if (!affRows.length) { res.status(404).json({ error: 'Affiliate not found' }); return; }

    const pending = await query<{ id: number; commission_amount: string }>(
      `SELECT id, commission_amount FROM referral_conversions
       WHERE affiliate_id = $1 AND status = 'pending'`, [affiliate_id]
    );
    if (!pending.length) { res.status(409).json({ error: 'No pending conversions for this affiliate' }); return; }

    const total = pending.reduce((s, r) => s + parseFloat(r.commission_amount), 0);
    const minPayout = parseFloat(affRows[0].min_payout);
    if (minPayout > 0 && total < minPayout) {
      res.status(409).json({
        error: `Pending commission (₱${total.toFixed(2)}) is below the minimum payout threshold (₱${minPayout.toFixed(2)})`,
      });
      return;
    }

    await withTransaction(async (client) => {
      await client.query(
        `UPDATE referral_conversions SET status = 'paid' WHERE affiliate_id = $1 AND status = 'pending'`,
        [affiliate_id]
      );
      await client.query(
        'UPDATE affiliates SET lifetime_earned = lifetime_earned + $1 WHERE id = $2',
        [total.toFixed(2), affiliate_id]
      );
    });
    res.json({ paid: pending.length, total_commission: total.toFixed(2) });
  } catch (err) { next(err); }
});

router.get('/export', requireAuth, async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rows = await query<Record<string, unknown>>(`
      SELECT r.id, a.member_name, r.promo_code, r.buyer_action,
             r.sale_amount, r.commission_amount, r.status,
             TO_CHAR(r.created_at, 'YYYY-MM-DD') AS date
      FROM referral_conversions r
      JOIN affiliates a ON a.id = r.affiliate_id
      ORDER BY r.created_at DESC
    `);
    const escape = (v: string) => v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"` : v;
    const header = 'ID,Affiliate,Code,Buyer Action,Sale Amount,Commission,Status,Date\n';
    const body = rows.map(r =>
      `${r.id},${escape(String(r.member_name))},${r.promo_code},${escape(String(r.buyer_action))},${r.sale_amount},${r.commission_amount},${r.status},${r.date}`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aya-commissions.csv"');
    res.send(header + body);
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
    const updated = await withTransaction(async (client) => {
      await client.query('UPDATE referral_conversions SET status = $1 WHERE id = $2', ['paid', id]);
      await client.query(
        'UPDATE affiliates SET lifetime_earned = lifetime_earned + $1 WHERE id = $2',
        [commission_amount, affiliate_id]
      );
      const result = await client.query('SELECT * FROM referral_conversions WHERE id = $1', [id]);
      return result.rows[0];
    });
    res.json(updated);
  } catch (err) { next(err); }
});

router.patch('/:id/void', requireAuth, async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = z.coerce.number().int().positive().parse(req.params.id);

    const convRows = await query<{ affiliate_id: number; commission_amount: string; status: string }>(
      'SELECT affiliate_id, commission_amount, status FROM referral_conversions WHERE id = $1', [id]
    );
    if (!convRows.length) { res.status(404).json({ error: 'Conversion not found' }); return; }
    if (convRows[0].status === 'void') {
      res.status(409).json({ error: 'Conversion is already void' });
      return;
    }

    const wasPaid = convRows[0].status === 'paid';
    const { affiliate_id, commission_amount } = convRows[0];

    const updated = await withTransaction(async (client) => {
      await client.query('UPDATE referral_conversions SET status = $1 WHERE id = $2', ['void', id]);
      // If it was already paid out, roll the commission back off the affiliate's lifetime total
      if (wasPaid) {
        await client.query(
          'UPDATE affiliates SET lifetime_earned = lifetime_earned - $1 WHERE id = $2',
          [commission_amount, affiliate_id]
        );
      }
      const result = await client.query('SELECT * FROM referral_conversions WHERE id = $1', [id]);
      return result.rows[0];
    });
    res.json(updated);
  } catch (err) { next(err); }
});

export default router;
