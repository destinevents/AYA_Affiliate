import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }

  const validUsername = username === process.env.ADMIN_USERNAME;
  const storedPassword = process.env.ADMIN_PASSWORD ?? '';

  // Support both plain-text (compared directly) and bcrypt hashes
  const validPassword = storedPassword.startsWith('$2')
    ? await bcrypt.compare(password, storedPassword)
    : password === storedPassword;

  if (!validUsername || !validPassword) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
  res.json({ token });
});

export default router;
