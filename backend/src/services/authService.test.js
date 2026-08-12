import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveNameFromAuth0User, deriveNameFromWorkosUser, findOrCreateAuth0User, findOrCreateWorkosUser } from './authService.js';

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

test('deriveNameFromAuth0User uses profile fields in priority order', () => {
  assert.equal(deriveNameFromAuth0User({ name: 'Sam Lee', nickname: 'sam', email: 'sam@example.com' }), 'Sam Lee');
  assert.equal(deriveNameFromAuth0User({ nickname: 'sam', email: 'sam@example.com' }), 'sam');
  assert.equal(deriveNameFromAuth0User({ email: 'sam@example.com' }), 'sam');
  assert.equal(deriveNameFromAuth0User({}), 'New User');
});

test('findOrCreateAuth0User rejects incomplete or unverified profiles before database access', async () => {
  await assert.rejects(findOrCreateAuth0User({ email: 'sam@example.com', email_verified: true }), /subject identifier/);
  await assert.rejects(findOrCreateAuth0User({ sub: 'auth0|123', email_verified: true }), /missing an email/);
  await assert.rejects(findOrCreateAuth0User({ sub: 'auth0|123', email: 'sam@example.com', email_verified: false }), /not verified/);
});
