import test from 'node:test';
import assert from 'node:assert/strict';
import { isPreviewEnvironment, shouldStartSchedulers } from './runtimeSafety.js';

test('preview and staging environments are detected', () => {
  assert.equal(isPreviewEnvironment({ VERCEL_ENV: 'preview' }), true);
  assert.equal(isPreviewEnvironment({ APP_ENV: 'staging' }), true);
  assert.equal(isPreviewEnvironment({ ENVIRONMENT: 'production' }), false);
});

test('explicit scheduler disable always wins', () => {
  assert.equal(shouldStartSchedulers({ DISABLE_SCHEDULERS: 'true', ENVIRONMENT: 'production' }), false);
});

test('preview cannot start schedulers by accident', () => {
  assert.equal(shouldStartSchedulers({ VERCEL_ENV: 'preview' }), false);
  assert.equal(shouldStartSchedulers({ APP_ENV: 'preview' }), false);
});

test('production behavior remains enabled unless explicitly disabled', () => {
  assert.equal(shouldStartSchedulers({ ENVIRONMENT: 'production' }), true);
  assert.equal(shouldStartSchedulers({ VERCEL_ENV: 'production' }), true);
});
