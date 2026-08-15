import test from 'node:test';
import assert from 'node:assert/strict';
import { nextRunFor, JOB_TYPES } from './automationService.js';

const BASE = new Date('2026-01-01T00:00:00.000Z');
const hoursBetween = (a, b) => (b.getTime() - a.getTime()) / 3_600_000;

test('nextRunFor maps each known cadence to its interval', () => {
  assert.equal(hoursBetween(BASE, nextRunFor('hourly', BASE)), 1);
  assert.equal(hoursBetween(BASE, nextRunFor('daily', BASE)), 24);
  assert.equal(hoursBetween(BASE, nextRunFor('weekly', BASE)), 168);
});

test('nextRunFor is case-insensitive', () => {
  assert.equal(hoursBetween(BASE, nextRunFor('DAILY', BASE)), 24);
  assert.equal(hoursBetween(BASE, nextRunFor('Weekly', BASE)), 168);
});

test('nextRunFor falls back to daily instead of throwing on unknown input', () => {
  // `cadence` is a free VARCHAR on a table that predates this feature, so rows
  // can hold values this map has never seen. Throwing here would take the
  // scheduler down for every user because of one bad row.
  for (const bad of ['fortnightly', '', null, undefined, 'monthly']) {
    assert.equal(hoursBetween(BASE, nextRunFor(bad, BASE)), 24, `cadence: ${String(bad)}`);
  }
});

test('nextRunFor returns a distinct Date and does not mutate its input', () => {
  const from = new Date(BASE);
  const result = nextRunFor('daily', from);
  assert.notEqual(result, from);
  assert.equal(from.toISOString(), BASE.toISOString());
});

test('JOB_TYPES is the exact set the spec asks for', () => {
  assert.deepEqual(JOB_TYPES, ['content_creation', 'lead_follow_up', 'performance_review']);
});
