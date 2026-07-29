import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAnalytics, getOptimization } from '../services/analyticsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await getAnalytics(req.userId));
}));

router.get('/optimization', authenticateToken, asyncHandler(async (req, res) => {
  res.json(await getOptimization(req.userId));
}));

export default router;
