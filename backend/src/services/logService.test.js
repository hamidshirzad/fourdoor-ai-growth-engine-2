import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAgentLog } from './logService.js';

test('normalizeAgentLog renames created_at to createdAt', () => {
  // The regression this guards: GET /api/activity/logs served Postgres rows
  // with `created_at` while the UI read `createdAt`, so every entry rendered
  // with the current time and moved on each 15s poll.
  const at = new Date('2026-01-01T00:00:00.000Z');
  const row = normalizeAgentLog({ id: 'log-1', agent: 'contentAgent', created_at: at });

  assert.equal(row.createdAt, at);
  assert.ok(!('created_at' in row), 'snake_case key should not survive');
  assert.equal(row.id, 'log-1');
  assert.equal(row.agent, 'contentAgent');
});

test('normalizeAgentLog leaves an already-camelCase row untouched', () => {
  // Firestore documents arrive in the target shape; passing one through must
  // not blank its timestamp.
  const firestoreDoc = { id: 'log-2', createdAt: '2026-01-01T00:00:00.000Z' };
  assert.deepEqual(normalizeAgentLog(firestoreDoc), firestoreDoc);
});

test('normalizeAgentLog preserves a null timestamp rather than dropping the key', () => {
  // `agent_logs.created_at` is NOT NULL, but a null must still map across as
  // null: the UI distinguishes "no timestamp" from "now", and silently losing
  // the key would put it back on the render-time fallback.
  const row = normalizeAgentLog({ id: 'log-3', created_at: null });
  assert.equal(row.createdAt, null);
  assert.ok('createdAt' in row);
});

test('normalizeAgentLog tolerates absent and nullish rows', () => {
  assert.deepEqual(normalizeAgentLog({ id: 'log-4' }), { id: 'log-4' });
  assert.equal(normalizeAgentLog(null), null);
  assert.equal(normalizeAgentLog(undefined), undefined);
});
