import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getAgentLogs } from '../services/logService.js';
import { getFirestoreAgentLogs } from '../services/firestoreLogService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = express.Router();

// Both branches return `createdAt`: Firestore documents carry it natively, and
// getAgentLogs normalises the Postgres `created_at` column to match, so this
// endpoint has one response shape regardless of which source answers.
router.get('/logs', authenticateToken, asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const source = req.query.source; // optional filter: 'firestore' or 'db'

  if (source === 'firestore') {
    const fsLogs = await getFirestoreAgentLogs(req.userId, limit);
    return res.json(fsLogs);
  }

  const firestoreLogs = await getFirestoreAgentLogs(req.userId, limit);
  if (firestoreLogs && firestoreLogs.length > 0) {
    return res.json(firestoreLogs);
  }

  res.json(await getAgentLogs(req.userId, limit));
}));

export default router;
