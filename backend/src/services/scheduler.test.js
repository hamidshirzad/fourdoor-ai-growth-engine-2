import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runDailyContentGenerationOnce, runDailyOptimizationOnce, startSchedulers } from './scheduler.js';

test('startSchedulers respects DISABLE_SCHEDULERS case-insensitively', () => {
  const previous = process.env.DISABLE_SCHEDULERS;
  process.env.DISABLE_SCHEDULERS = 'TRUE';
  try {
    assert.equal(startSchedulers(), false);
  } finally {
    if (previous === undefined) delete process.env.DISABLE_SCHEDULERS;
    else process.env.DISABLE_SCHEDULERS = previous;
  }
});

test('runDailyContentGenerationOnce isolates a per-campaign failure', async () => {
  const rows = [
    { id: 'campaign-1', user_id: 'user-1' },
    { id: 'campaign-2', user_id: 'user-2' },
    { id: 'campaign-3', user_id: 'user-3' }
  ];
  const processed = [];
  const failures = [];

  await runDailyContentGenerationOnce(rows, {
    generate: async (user) => {
      if (user.id === 'user-2') throw new Error('simulated content agent failure');
      processed.push(user.id);
    },
    log: async (userId, agent, action, status, input) => {
      failures.push({ userId, campaignId: input.campaignId });
    }
  });

  assert.deepEqual(processed, ['user-1', 'user-3']);
  assert.equal(failures.length, 1);
  assert.equal(failures[0].userId, 'user-2');
  assert.equal(failures[0].campaignId, 'campaign-2');
});

test('runDailyOptimizationOnce isolates a per-user failure', async () => {
  const rows = [{ id: 'user-1' }, { id: 'user-2' }, { id: 'user-3' }];
  const processed = [];
  const failures = [];

  await runDailyOptimizationOnce(rows, {
    optimize: async (userId) => {
      if (userId === 'user-1') throw new Error('simulated analytics agent failure');
      processed.push(userId);
    },
    log: async (userId) => {
      failures.push(userId);
    }
  });

  assert.deepEqual(processed, ['user-2', 'user-3']);
  assert.deepEqual(failures, ['user-1']);
});
