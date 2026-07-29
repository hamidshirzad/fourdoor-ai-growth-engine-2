import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAuditLogEvent,
  isAuditLogEnabled,
  sendAuditLogEvent,
  __setWorkosClientForTests,
  __resetWorkosClientForTests
} from './workosService.js';

after(() => {
  __resetWorkosClientForTests();
});

test('audit logging is disabled and no-ops when WorkOS is not configured', async () => {
  __setWorkosClientForTests(null);
  assert.equal(isAuditLogEnabled(), false);
  assert.equal(await sendAuditLogEvent({ userId: 'u1', agent: 'sales_agent', action: 'qualify', status: 'success' }), null);
});

test('buildAuditLogEvent prefixes the action and uses a system actor for null userId', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const event = buildAuditLogEvent({ userId: null, agent: 'scheduler', action: 'daily_content_generation', status: 'failed' }, now);
  assert.equal(event.action, 'agent.daily_content_generation');
  assert.deepEqual(event.actor, { type: 'system', id: 'system' });
  assert.deepEqual(event.targets, [{ type: 'agent', id: 'scheduler' }]);
  assert.equal(event.occurredAt, now);
  assert.deepEqual(event.metadata, { status: 'failed' });
});

test('buildAuditLogEvent keeps metadata small (no input/output payloads)', () => {
  const event = buildAuditLogEvent({
    userId: 'u1', agent: 'a', action: 'x', status: 'success',
    input: { big: 'payload' }, output: { bigger: 'payload' }
  });
  assert.deepEqual(Object.keys(event.metadata), ['status']);
});

test('sendAuditLogEvent sends to the configured organization', async () => {
  const sent = [];
  __setWorkosClientForTests({
    auditLogs: { createEvent: async (orgId, event) => { sent.push({ orgId, event }); } }
  }, 'org_123');
  const event = await sendAuditLogEvent({ userId: 'u1', agent: 'sales_agent', action: 'qualify', status: 'success' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].orgId, 'org_123');
  assert.equal(event.actor.id, 'u1');
});

test('sendAuditLogEvent never throws when the client errors', async () => {
  __setWorkosClientForTests({
    auditLogs: { createEvent: async () => { throw new Error('workos down'); } }
  });
  assert.equal(await sendAuditLogEvent({ userId: 'u1', agent: 'a', action: 'x', status: 'success' }), null);
});
