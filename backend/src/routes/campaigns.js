import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import {
  activateCampaignAutomation,
  deactivateCampaignAutomation,
  listAutomationJobs,
  listCampaigns
} from '../services/automationService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

// `active` is the only required field: the toggle must work on its own, so a
// user can pause a campaign without re-sending the whole mission. Everything
// else is optional and COALESCEd in the service, leaving unspecified fields at
// their current values rather than blanking them.
const missionSchema = z.object({
  active: z.boolean(),
  objective: z.string().min(2).max(2000).optional(),
  targetAudience: z.string().min(2).max(2000).optional(),
  budgetRange: z.string().max(60).optional(),
  channels: z.array(z.string().min(1).max(40)).max(20).optional(),
  cadence: z.enum(['hourly', 'daily', 'weekly']).optional()
});

const jobQuerySchema = z.object({
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
  campaignId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional()
});

router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  res.json({ campaigns: await listCampaigns(req.userId) });
}));

// Declared before '/:id/automation' so the literal path is not captured by the
// parameterised one.
router.get('/jobs', authenticateToken, asyncHandler(async (req, res) => {
  const parsed = jobQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid job filter' });
  }
  res.json({ jobs: await listAutomationJobs(req.userId, parsed.data) });
}));

router.put('/:id/automation', authenticateToken, validate(missionSchema), asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!z.string().uuid().safeParse(id).success) {
    return res.status(400).json({ error: 'Invalid campaign id' });
  }

  // req.userId is taken from the verified JWT, never from the body, so a caller
  // cannot activate automation on someone else's campaign.
  const { active, ...mission } = req.body;
  const result = active
    ? await activateCampaignAutomation(req.userId, id, mission)
    : await deactivateCampaignAutomation(req.userId, id);

  res.json({ success: true, ...result });
}));

export default router;
