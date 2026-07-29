import pool from '../db/pool.js';
import { putAgentLog } from './dynamoService.js';
import { sendAuditLogEvent } from './workosService.js';
import { putFirestoreAgentLog } from './firestoreLogService.js';

export async function logAgent(userId, agent, action, status, input = {}, output = {}) {
  const result = await pool.query(
    `INSERT INTO agent_logs (user_id, agent, action, status, input, output)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId || null, agent, action, status, JSON.stringify(input), JSON.stringify(output)]
  );
  // Fire-and-forget mirrors: neither call ever throws, and awaiting them
  // would couple request latency to DynamoDB/WorkOS network behavior.
  void Promise.allSettled([
    putAgentLog({ userId, agent, action, status, input, output }),
    putFirestoreAgentLog({ userId, agent, action, status, input, output }),
    sendAuditLogEvent({ userId, agent, action, status })
  ]);
  return result.rows[0];
}

export async function getAgentLogs(userId, limit = 100) {
  const result = await pool.query(
    `SELECT * FROM agent_logs
     WHERE user_id = $1 OR user_id IS NULL
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows;
}
