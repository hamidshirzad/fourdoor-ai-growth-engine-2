import express from 'express';
import { z } from 'zod';
import { verifyControlPlaneRequest } from '../middleware/internalControlPlaneAuth.js';
import { syncControlPlaneCampaign } from '../services/controlPlaneBridgeService.js';

const router = express.Router();

const schema = z.object({
  identity: z.object({
    provider: z.literal('firebase').default('firebase'),
    subject: z.string().min(1).max(255),
    email: z.string().email().max(255),
    emailVerified: z.literal(true),
    name: z.string().max(255).optional(),
    company: z.string().max(255).optional(),
    plan: z.enum(['starter', 'pro', 'agency']),
    subscriptionStatus: z.enum(['active', 'trialing'])
  }),
  campaign: z.object({
    externalId: z.string().min(1).max(255),
    name: z.string().min(1).max(255),
    niche: z.string().min(1).max(255),
    audience: z.string().min(1).max(2000),
    goal: z.string().min(1).max(2000),
    tone: z.string().max(100).optional(),
    budgetRange: z.string().max(60).optional(),
    channels: z.array(z.string().min(1).max(40)).max(20).default([]),
    cadence: z.enum(['hourly', 'daily', 'weekly']).default('daily'),
    active: z.boolean().default(true)
  })
});

router.post('/campaigns/sync', verifyControlPlaneRequest, async (req, res, next) => {
  try {
    const parsed = schema.safeParse(req.internalBody);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid control-plane payload', issues: parsed.error.issues });
    }
    const result = await syncControlPlaneCampaign(parsed.data);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

export default router;
