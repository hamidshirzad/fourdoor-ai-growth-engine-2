import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  contentAgent,
  engagementAgent,
  salesAgent,
  analyticsAgent,
  outreachAgent,
  __setOpenAIClientForTests,
  __resetOpenAIClientForTests
} from './aiService.js';
import { QUALIFICATION_THRESHOLD, MAX_OUTREACH_SUBJECT_LEN, MAX_OUTREACH_BODY_LEN, MAX_ENGAGEMENT_REPLY_LEN } from '../config/constants.js';

after(() => {
  __resetOpenAIClientForTests();
});

test('contentAgent falls back with no client configured', async () => {
  __setOpenAIClientForTests(null);
  const output = await contentAgent({ niche: 'coaching', audience: 'founders', goal: 'more calls' });
  assert.equal(output._degraded, true);
  assert.equal(typeof output.hook, 'string');
  assert.ok(Array.isArray(output.variants));
  assert.equal(typeof output.predictedScore, 'number');
});

test('engagementAgent falls back with no client configured', async () => {
  __setOpenAIClientForTests(null);
  const output = await engagementAgent({ message: 'How much does this cost?' });
  assert.equal(output._degraded, true);
  assert.ok(['casual', 'interested', 'buyer'].includes(output.intent));
  assert.equal(typeof output.reply, 'string');
});

test('salesAgent falls back with no client configured', async () => {
  __setOpenAIClientForTests(null);
  const output = await salesAgent({ message: 'Looking for pricing info' });
  assert.equal(output._degraded, true);
  assert.equal(typeof output.score, 'number');
  assert.equal(typeof output.qualified, 'boolean');
});

test('analyticsAgent falls back with no client configured', async () => {
  __setOpenAIClientForTests(null);
  const output = await analyticsAgent({ metrics: {}, recentPosts: [] });
  assert.equal(output._degraded, true);
  assert.ok(Array.isArray(output.insights));
});

test('outreachAgent falls back with no client configured', async () => {
  __setOpenAIClientForTests(null);
  const output = await outreachAgent({ lead: { name: 'Sam', company: 'Acme' }, context: '' });
  assert.equal(output._degraded, true);
  assert.equal(typeof output.subject, 'string');
  assert.equal(typeof output.body, 'string');
});

test('structuredResponse falls back gracefully when the OpenAI call throws', async () => {
  __setOpenAIClientForTests({
    responses: {
      create: async () => {
        throw new Error('rate limited');
      }
    }
  });
  const output = await contentAgent({ niche: 'coaching', audience: 'founders', goal: 'more calls' });
  assert.equal(output._degraded, true);
  assert.equal(typeof output.hook, 'string');
});

test('structuredResponse falls back gracefully on malformed JSON output', async () => {
  __setOpenAIClientForTests({
    responses: {
      create: async () => ({ output_text: 'not json' })
    }
  });
  const output = await salesAgent({ message: 'test' });
  assert.equal(output._degraded, true);
  assert.equal(typeof output.score, 'number');
});

test('outreachAgent truncates oversized live-model subject/body', async () => {
  __setOpenAIClientForTests({
    responses: {
      create: async () => ({
        output_text: JSON.stringify({
          subject: 'x'.repeat(MAX_OUTREACH_SUBJECT_LEN + 50),
          body: 'y'.repeat(MAX_OUTREACH_BODY_LEN + 500)
        })
      })
    }
  });
  const output = await outreachAgent({ lead: { name: 'Sam', company: 'Acme' }, context: '' });
  assert.equal(output._degraded, undefined);
  assert.equal(output.subject.length, MAX_OUTREACH_SUBJECT_LEN);
  assert.equal(output.body.length, MAX_OUTREACH_BODY_LEN);
});

test('engagementAgent truncates oversized live-model reply', async () => {
  __setOpenAIClientForTests({
    responses: {
      create: async () => ({
        output_text: JSON.stringify({
          intent: 'casual',
          reply: 'z'.repeat(MAX_ENGAGEMENT_REPLY_LEN + 200),
          shouldEscalate: false,
          leadSignal: 'test'
        })
      })
    }
  });
  const output = await engagementAgent({ message: 'hi' });
  assert.equal(output._degraded, undefined);
  assert.equal(output.reply.length, MAX_ENGAGEMENT_REPLY_LEN);
});

test('fallback outputs are truncated too', async () => {
  __setOpenAIClientForTests(null);
  const output = await outreachAgent({ lead: { company: 'C'.repeat(MAX_OUTREACH_SUBJECT_LEN + 100) }, context: '' });
  assert.equal(output._degraded, true);
  assert.equal(output.subject.length, MAX_OUTREACH_SUBJECT_LEN);
});

test('salesAgent fallback qualified flips exactly at QUALIFICATION_THRESHOLD', async () => {
  __setOpenAIClientForTests(null);
  const atThreshold = await salesAgent({ message: 'We run a small agency and have a monthly budget already approved.' });
  assert.equal(atThreshold.score, QUALIFICATION_THRESHOLD);
  assert.equal(atThreshold.qualified, false);

  const aboveThreshold = await salesAgent({ message: 'We run a small agency, have a monthly budget approved, and need to start this week.' });
  assert.ok(aboveThreshold.score > QUALIFICATION_THRESHOLD);
  assert.equal(aboveThreshold.qualified, true);
});
