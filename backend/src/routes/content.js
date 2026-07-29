import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { generateDailyContent, getUserPosts, schedulePost, recordPostMetrics } from '../services/contentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

const generateSchema = z.object({
  niche: z.string().min(2),
  audience: z.string().min(2),
  goal: z.string().min(2),
  tone: z.string().optional(),
  name: z.string().optional(),
  campaignId: z.string().uuid().optional(),
  platforms: z.array(z.enum(['linkedin', 'x', 'instagram', 'tiktok'])).optional()
});

router.post('/generate', authenticateToken, validate(generateSchema), asyncHandler(async (req, res) => {
  const content = await generateDailyContent(req.user, req.body);
  res.status(201).json({ success: true, ...content });
}));

router.post('/schedule', authenticateToken, validate(z.object({
  postId: z.string().uuid(),
  scheduledAt: z.string().datetime(),
  platform: z.enum(['linkedin', 'x', 'instagram', 'tiktok']).optional(),
  variantIndex: z.number().int().min(0).optional()
})), asyncHandler(async (req, res) => {
  const post = await schedulePost(req.user, req.body);
  res.json({ success: true, post });
}));

router.get('/posts', authenticateToken, asyncHandler(async (req, res) => {
  const posts = await getUserPosts(req.userId, req.query.limit || 100);
  res.json(posts);
}));

router.post('/metrics', authenticateToken, validate(z.object({
  postId: z.string().uuid(),
  impressions: z.number().int().min(0).optional(),
  clicks: z.number().int().min(0).optional(),
  comments: z.number().int().min(0).optional(),
  shares: z.number().int().min(0).optional(),
  likes: z.number().int().min(0).optional(),
  leads: z.number().int().min(0).optional(),
  bookings: z.number().int().min(0).optional()
})), asyncHandler(async (req, res) => {
  const metrics = await recordPostMetrics(req.userId, req.body.postId, req.body);
  res.json({ success: true, metrics });
}));

export default router;
