import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALIFICATION_THRESHOLD,
  MAX_OUTREACH_SUBJECT_LEN,
  MAX_OUTREACH_BODY_LEN,
  MAX_ENGAGEMENT_REPLY_LEN
} from './constants.js';

test('QUALIFICATION_THRESHOLD pins the intended business value', () => {
  assert.equal(QUALIFICATION_THRESHOLD, 70);
});

test('length constants are positive integers', () => {
  for (const value of [MAX_OUTREACH_SUBJECT_LEN, MAX_OUTREACH_BODY_LEN, MAX_ENGAGEMENT_REPLY_LEN]) {
    assert.ok(Number.isInteger(value) && value > 0);
  }
});
