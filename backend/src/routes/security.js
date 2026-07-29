import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { scanContent, getScans, getScanById } from '../services/aikidoService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

const scanSchema = z.object({
  content: z.string().min(1).max(50000),
  type: z.enum(['content', 'code', 'dependency']).default('content'),
  postId: z.string().uuid().optional(),
  campaignId: z.string().uuid().optional()
});

router.post('/scan', authenticateToken, validate(scanSchema), asyncHandler(async (req, res) => {
  const result = await scanContent(
    req.userId,
    req.body.content,
    req.body.type,
    req.body.postId,
    req.body.campaignId
  );
  res.status(201).json({ success: true, ...result });
}));

router.get('/scans', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || 50), 100);
  const offset = parseInt(req.query.offset || 0);
  const scans = await getScans(req.userId, limit, offset);
  res.json(scans);
}));

router.get('/scans/:id', authenticateToken, asyncHandler(async (req, res) => {
  const scan = await getScanById(req.userId, req.params.id);
  if (!scan) {
    return res.status(404).json({ error: 'Scan not found' });
  }
  res.json(scan);
}));

export default router;
