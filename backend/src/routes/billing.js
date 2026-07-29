import express from 'express';
import { z } from 'zod';
import { createSubscription, getPlans, handleWebhook, verifyWebhook } from '../services/billingService.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

router.post('/subscribe', authenticateToken, validate(z.object({
  plan: z.enum(['starter', 'pro', 'agency']),
  returnUrl: z.string().url(),
  cancelUrl: z.string().url().optional()
})), asyncHandler(async (req, res) => {
  const subscription = await createSubscription(req.userId, req.body.plan, req.body.returnUrl, req.body.cancelUrl);
  res.status(201).json({ success: true, subscription });
}));

router.post('/webhook', asyncHandler(async (req, res) => {
  const verification = await verifyWebhook(req.headers, req.body);
  if (verification.verified === false && !verification.skipped) {
    return res.status(400).json({ error: 'Invalid PayPal webhook signature' });
  }
  const result = await handleWebhook(req.body);
  res.json(result);
}));

router.get('/plans', (req, res) => {
  res.json(getPlans());
});

export default router;
