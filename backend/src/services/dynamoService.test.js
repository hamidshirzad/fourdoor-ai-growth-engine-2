import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAgentLogItem,
  isDynamoLoggingEnabled,
  putAgentLog,
  queryAgentLogs,
  __setDynamoClientForTests,
  __resetDynamoClientForTests
} from './dynamoService.js';

after(() => {
  __resetDynamoClientForTests();
});

test('logging is disabled and no-ops when no table is configured', async () => {
  __setDynamoClientForTests(null);
  assert.equal(isDynamoLoggingEnabled(), false);
  assert.equal(await putAgentLog({ userId: 'u1', agent: 'a', action: 'x', status: 'success' }), null);
  assert.deepEqual(await queryAgentLogs('u1'), []);
});

test('buildAgentLogItem uses the system partition for null userId and sets TTL', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const item = buildAgentLogItem({ userId: null, agent: 'scheduler', action: 'run', status: 'failed' }, now);
  assert.equal(item.pk, 'system');
  assert.ok(item.sk.startsWith('2026-01-01T00:00:00.000Z#'));
  assert.equal(item.createdAt, now.toISOString());
  // default retention 90 days
  assert.equal(item.expiresAt, Math.floor(now.getTime() / 1000) + 90 * 24 * 60 * 60);
});

test('putAgentLog sends the item to the configured table', async () => {
  const sent = [];
  __setDynamoClientForTests({ send: async (command) => { sent.push(command.input); } }, 'my-table');
  const item = await putAgentLog({ userId: 'u1', agent: 'sales_agent', action: 'qualify', status: 'success', input: { a: 1 }, output: { b: 2 } });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].TableName, 'my-table');
  assert.equal(sent[0].Item.pk, 'u1');
  assert.equal(item.agent, 'sales_agent');
});

test('putAgentLog never throws when the client errors', async () => {
  __setDynamoClientForTests({ send: async () => { throw new Error('provisioning exceeded'); } });
  const result = await putAgentLog({ userId: 'u1', agent: 'a', action: 'x', status: 'success' });
  assert.equal(result, null);
});

test('queryAgentLogs returns items and falls back to [] on errors', async () => {
  const items = [{ pk: 'u1', sk: 's1' }];
  __setDynamoClientForTests({ send: async (command) => ({ Items: items }) });
  assert.deepEqual(await queryAgentLogs('u1'), items);

  __setDynamoClientForTests({ send: async () => { throw new Error('down'); } });
  assert.deepEqual(await queryAgentLogs('u1'), []);
});
