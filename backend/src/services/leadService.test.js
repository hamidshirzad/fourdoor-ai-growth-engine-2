import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveLeadStatus, csvLeadSchema } from './leadService.js';

test('deriveLeadStatus marks qualified leads and enables booking', () => {
  const result = deriveLeadStatus({ qualified: true, score: 85 });
  assert.equal(result.status, 'qualified');
  assert.equal(result.shouldBook, true);
  assert.equal(result.score, 85);
});

test('deriveLeadStatus keeps the current status for unqualified leads', () => {
  const result = deriveLeadStatus({ qualified: false, score: 40 }, 'new');
  assert.equal(result.status, 'new');
  assert.equal(result.shouldBook, false);
});

test('deriveLeadStatus preserves an existing non-default status when not (re)qualified', () => {
  const result = deriveLeadStatus({ qualified: false, score: 20 }, 'contacted');
  assert.equal(result.status, 'contacted');
});

test('deriveLeadStatus clamps out-of-range scores into 0-100', () => {
  assert.equal(deriveLeadStatus({ qualified: true, score: 999 }).score, 100);
  assert.equal(deriveLeadStatus({ qualified: false, score: -5 }).score, 0);
});

test('deriveLeadStatus ignores an inconsistent model qualified flag', () => {
  const inflated = deriveLeadStatus({ qualified: true, score: 10 });
  assert.equal(inflated.status, 'new');
  assert.equal(inflated.shouldBook, false);

  const deflated = deriveLeadStatus({ qualified: false, score: 95 });
  assert.equal(deflated.status, 'qualified');
  assert.equal(deflated.shouldBook, true);
});

test('csvLeadSchema rejects rows without email or message', () => {
  assert.equal(csvLeadSchema.safeParse({ name: 'Sam' }).success, false);
  assert.equal(csvLeadSchema.safeParse({ email: 'not-an-email' }).success, false);
  assert.equal(csvLeadSchema.safeParse({ email: 'sam@acme.com' }).success, true);
  assert.equal(csvLeadSchema.safeParse({ message: 'Interested in a demo' }).success, true);
});

test('csvLeadSchema caps email length at the DB column size (255)', () => {
  const overLimit = `${'a'.repeat(250)}@acme.com`;
  assert.equal(csvLeadSchema.safeParse({ email: overLimit }).success, false);
});
