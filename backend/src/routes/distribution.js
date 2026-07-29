import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { connectSocialAccount, listSocialAccounts } from '../services/distributionService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

router.get('/accounts', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await listSocialAccounts(req.userId));
}));

router.post('/accounts', authenticateToken, validate(z.object({
  platform: z.enum(['linkedin', 'x', 'instagram']),
  accountName: z.string().optional(),
  accountId: z.string().optional(),
  accessToken: z.string().min(10),
  refreshToken: z.string().optional(),
  metadata: z.record(z.any()).optional()
})), asyncHandler(async (req, res) => {
  const account = await connectSocialAccount(req.userId, req.body);
  res.status(201).json({ success: true, account });
}));

export default router;
