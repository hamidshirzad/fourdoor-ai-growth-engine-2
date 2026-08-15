import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAutomationWorkerEnabled,
  normalizeBatchSize,
  normalizePollMs,
  normalizeStaleLockMinutes,
  retryDelayMs
} from './automationWorkerPolicy.js';

test('worker requires explicit true', () => {
  assert.equal(isAutomationWorkerEnabled(undefined), false);
  assert.equal(isAutomationWorkerEnabled('false'), false);
  assert.equal(isAutomationWorkerEnabled('TRUE'), true);
});

test('retry delay increases and caps at one hour', () => {
  assert.equal(retryDelayMs(1), 60_000);
  assert.equal(retryDelayMs(2), 300_000);
  assert.equal(retryDelayMs(3), 1_500_000);
  assert.equal(retryDelayMs(99), 3_600_000);
});

test('batch size is bounded', () => {
  assert.equal(normalizeBatchSize(undefined), 5);
  assert.equal(normalizeBatchSize('0'), 5);
  assert.equal(normalizeBatchSize('8'), 8);
  assert.equal(normalizeBatchSize('999'), 20);
});

test('poll interval cannot become a hot loop', () => {
  assert.equal(normalizePollMs(undefined), 30_000);
  assert.equal(normalizePollMs('100'), 30_000);
  assert.equal(normalizePollMs('10000'), 10_000);
  assert.equal(normalizePollMs('9999999'), 300_000);
});

test('stale lock threshold stays within safe bounds', () => {
  assert.equal(normalizeStaleLockMinutes(undefined), 30);
  assert.equal(normalizeStaleLockMinutes('1'), 30);
  assert.equal(normalizeStaleLockMinutes('45'), 45);
  assert.equal(normalizeStaleLockMinutes('99999'), 1440);
});
