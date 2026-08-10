import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBillingReturnUrl } from './billing.js';

test('validateBillingReturnUrl accepts paths on an approved frontend origin', () => {
  assert.equal(
    validateBillingReturnUrl('https://app.example.com/billing?source=pricing', ['https://app.example.com']),
    'https://app.example.com/billing?source=pricing'
  );
});

test('validateBillingReturnUrl rejects checkout redirects to an unapproved origin', () => {
  assert.throws(
    () => validateBillingReturnUrl('https://attacker.example/collect', ['https://app.example.com']),
    /approved frontend origin/
  );
});

test('validateBillingReturnUrl rejects non-URL input', () => {
  assert.throws(() => validateBillingReturnUrl('not a URL', ['https://app.example.com']));
});
