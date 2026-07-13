import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRouter from './routes/auth.js';
import affiliatesRouter from './routes/affiliates.js';
import campaignsRouter from './routes/campaigns.js';
import codesRouter from './routes/codes.js';
import conversionsRouter from './routes/conversions.js';
import webhookRouter from './routes/webhook.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Behind Railway's proxy — needed for rate limiting to see real client IPs
app.set('trust proxy', 1);

app.use(helmet());
app.use(morgan('combined'));
if (!process.env.FRONTEND_URL) {
  console.warn('[WARN] FRONTEND_URL is not set — CORS origin defaults to * (open). Set this in production.');
}

app.use(cors({
  origin: process.env.FRONTEND_URL ?? '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '64kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);
app.use('/api/affiliates', affiliatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/codes', codesRouter);
app.use('/api/conversions', conversionsRouter);
app.use('/api/webhook', webhookRouter);

// Must be registered after all routes
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`AYA Affiliate API running on port ${PORT}`);
});
