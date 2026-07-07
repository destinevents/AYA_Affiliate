import { Router, Response } from 'express';
import { query } from '../db/index.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (_req: AuthRequest, res: Response): Promise<void> => {
  const rows = await query('SELECT * FROM affiliates ORDER BY joined_at DESC');
  res.json(rows);
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { member_name, business, code, commission_rate } = req.body as {
    member_name: string; business?: string; code: string; commission_rate: number;
  };
  const rows = await query(
    'INSERT INTO affiliates (member_name, business, code, commission_rate) VALUES ($1,$2,$3,$4) RETURNING *',
    [member_name, business ?? null, code.toUpperCase(), commission_rate]
  );
  res.status(201).json(rows[0]);
});

router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const rows = await query<{ status: string }>(
    'SELECT status FROM affiliates WHERE id = $1', [id]
  );
  if (!rows.length) { res.status(404).json({ error: 'Not found' }); return; }

  const newStatus = rows[0].status === 'active' ? 'paused' : 'active';
  const updated = await query(
    'UPDATE affiliates SET status = $1 WHERE id = $2 RETURNING *',
    [newStatus, id]
  );
  res.json(updated[0]);
});

export default router;
