import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveNameFromWorkosUser, findOrCreateWorkosUser } from './authService.js';

test('findOrCreateWorkosUser rejects an SSO user without an email', async () => {
  await assert.rejects(findOrCreateWorkosUser({ id: 'workos_1' }), /missing an email/);
  await assert.rejects(findOrCreateWorkosUser({ id: 'workos_1', email: '   ' }), /missing an email/);
});

test('deriveNameFromWorkosUser joins first and last name', () => {
  assert.equal(deriveNameFromWorkosUser({ firstName: 'Sam', lastName: 'Lee', email: 'sam@acme.com' }), 'Sam Lee');
  assert.equal(deriveNameFromWorkosUser({ firstName: 'Sam', email: 'sam@acme.com' }), 'Sam');
});

test('deriveNameFromWorkosUser falls back to the email local part', () => {
  assert.equal(deriveNameFromWorkosUser({ email: 'sam.lee@acme.com' }), 'sam.lee');
});

test('deriveNameFromWorkosUser has a final fallback', () => {
  assert.equal(deriveNameFromWorkosUser({}), 'New User');
});
