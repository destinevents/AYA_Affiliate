import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import affiliatesRouter from './routes/affiliates.js';
import campaignsRouter from './routes/campaigns.js';
import codesRouter from './routes/codes.js';
import conversionsRouter from './routes/conversions.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors({
  origin: process.env.FRONTEND_URL ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/affiliates', affiliatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/codes', codesRouter);
app.use('/api/conversions', conversionsRouter);

app.listen(PORT, () => {
  console.log(`AYA Affiliate API running on port ${PORT}`);
});
