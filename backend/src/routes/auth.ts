import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts, try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    const validUsername = username === process.env.ADMIN_USERNAME;
    const storedPassword = process.env.ADMIN_PASSWORD ?? '';
    const validPassword = storedPassword.startsWith('$2')
      ? await bcrypt.compare(password, storedPassword)
      : password === storedPassword;

    if (!validUsername || !validPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET as string, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    next(err);
  }
});

export default router;
