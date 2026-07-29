import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import contentRoutes from './routes/content.js';
import leadsRoutes from './routes/leads.js';
import analyticsRoutes from './routes/analytics.js';
import billingRoutes from './routes/billing.js';
import distributionRoutes from './routes/distribution.js';
import activityRoutes from './routes/activity.js';
import uploadRoutes from './routes/upload.js';
import securityRoutes from './routes/security.js';
import liveAgentRoutes from './routes/liveAgent.js';
import { authenticateToken } from './middleware/auth.js';
import { checkDatabaseHealth } from './db/pool.js';

dotenv.config();

const app = express();

app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
}));
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  // `origin: true` reflected whatever Origin the caller sent, which is an
  // allow-all for credentialed requests. Pin it to CORS_ORIGIN in production;
  // with the variable unset (local dev) reflection is kept for convenience.
  origin: corsOrigins.length ? corsOrigins : true,
  credentials: true
}));

// Stripe signs the raw request bytes, so this route must be registered before
// express.json() gets a chance to parse and discard them.
app.use('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }));
app.use('/billing/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({
  windowMs: 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE || 120),
  standardHeaders: true,
  legacyHeaders: false
}));

// Health check endpoint for AWS ALB/ELB
app.get('/health', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const status = dbHealth.healthy ? 'healthy' : 'degraded';
  const httpStatus = dbHealth.healthy ? 200 : 503;
  
  res.status(httpStatus).json({
    status,
    service: 'fourdoor-ai-growth-engine',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    checks: {
      database: dbHealth.healthy ? 'connected' : 'disconnected',
      ...(dbHealth.error && { error: dbHealth.error })
    }
  });
});

// Simple liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// Readiness probe
app.get('/health/ready', async (req, res) => {
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.healthy) {
    res.json({ status: 'ready', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/live-agent', liveAgentRoutes);

// Brief-compatible aliases
app.use('/auth', authRoutes);
app.use('/billing', billingRoutes);
app.post('/generate-content', authenticateToken, (req, res, next) => {
  req.url = '/generate';
  contentRoutes(req, res, next);
});
app.post('/schedule-post', authenticateToken, (req, res, next) => {
  req.url = '/schedule';
  contentRoutes(req, res, next);
});
app.post('/engage', authenticateToken, (req, res, next) => {
  req.url = '/engage';
  leadsRoutes(req, res, next);
});
app.post('/qualify-lead', authenticateToken, (req, res, next) => {
  req.url = '/qualify';
  leadsRoutes(req, res, next);
});
app.get('/analytics', authenticateToken, (req, res, next) => {
  req.url = '/';
  analyticsRoutes(req, res, next);
});
app.post('/scan', authenticateToken, (req, res, next) => {
  req.url = '/scan';
  securityRoutes(req, res, next);
});

// Error handler. Without this, a rejected asyncHandler fell through to
// Express's default handler, which replies with an HTML stack trace — the
// frontend's response.json() then failed and every fault surfaced as a generic
// "API error". No 404 handler is registered on purpose: server.js mounts this
// app ahead of the Next.js request handler and unmatched paths must fall
// through to it.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Record already exists' });
  }
  const status = err.message?.includes('not configured') ? 503 : (err.status || 400);
  console.error(err);
  res.status(status).json({ error: err.message || 'Internal server error' });
});

export default app;
