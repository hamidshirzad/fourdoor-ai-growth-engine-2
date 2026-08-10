import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  __resetStripeDependenciesForTests,
  __setStripeDependenciesForTests,
  createCheckoutSession,
  handleWebhook,
  plans
} from './stripeService.js';

afterEach(() => {
  __resetStripeDependenciesForTests();
});

test('createCheckoutSession creates a hosted subscription checkout without activating a plan', async () => {
  const originalPriceId = plans.pro.priceId;
  plans.pro.priceId = 'price_pro_test';
  const checkoutRequests = [];
  const queries = [];

  __setStripeDependenciesForTests({
    stripe: {
      customers: { create: async () => ({ id: 'cus_test' }) },
      checkout: {
        sessions: {
          create: async (request) => {
            checkoutRequests.push(request);
            return { id: 'cs_test', url: 'https://checkout.stripe.com/c/pay/cs_test' };
          }
        }
      }
    },
    db: {
      query: async (sql) => {
        queries.push(sql);
        if (sql.includes('SELECT id, email')) {
          return { rows: [{ id: 'user-1', email: 'buyer@example.com', name: 'Buyer', stripe_customer_id: null }] };
        }
        return { rowCount: 1, rows: [] };
      }
    }
  });

  try {
    const result = await createCheckoutSession(
      'user-1',
      'pro',
      'https://app.example.com/billing',
      'https://app.example.com/billing'
    );

    assert.deepEqual(result, {
      id: 'cs_test',
      checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test',
      status: 'pending'
    });
    assert.equal(checkoutRequests[0].mode, 'subscription');
    assert.deepEqual(checkoutRequests[0].line_items, [{ price: 'price_pro_test', quantity: 1 }]);
    assert.deepEqual(checkoutRequests[0].subscription_data.metadata, { userId: 'user-1', plan: 'pro' });
    assert.match(checkoutRequests[0].success_url, /checkout=success/);
    assert.equal(queries.some((sql) => sql.includes('subscription_status')), false);
  } finally {
    plans.pro.priceId = originalPriceId;
  }
});

test('handleWebhook records an event only after the subscription update succeeds', async () => {
  let updateAttempts = 0;
  let markedProcessed = 0;
  const db = {
    query: async (sql) => {
      if (sql.includes('SELECT 1 FROM processed_webhook_events')) return { rowCount: 0, rows: [] };
      if (sql.includes('UPDATE users')) {
        updateAttempts += 1;
        if (updateAttempts === 1) throw new Error('temporary database outage');
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes('INSERT INTO processed_webhook_events')) {
        markedProcessed += 1;
        return { rowCount: 1, rows: [] };
      }
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
  __setStripeDependenciesForTests({ db });

  const event = {
    id: 'evt_retry',
    type: 'customer.subscription.updated',
    data: {
      object: {
        id: 'sub_test',
        status: 'active',
        customer: 'cus_test',
        metadata: { userId: null, plan: 'pro' },
        items: { data: [{ price: { id: 'unconfigured_test_price' } }] }
      }
    }
  };

  await assert.rejects(handleWebhook(event), /temporary database outage/);
  assert.equal(markedProcessed, 0);

  const result = await handleWebhook(event);
  assert.equal(result.status, 'OK');
  assert.equal(result.subscriptionStatus, 'active');
  assert.equal(markedProcessed, 1);
});

test('handleWebhook ignores an event already processed successfully', async () => {
  __setStripeDependenciesForTests({
    db: {
      query: async (sql) => {
        assert.match(sql, /SELECT 1 FROM processed_webhook_events/);
        return { rowCount: 1, rows: [{ '?column?': 1 }] };
      }
    }
  });

  assert.deepEqual(
    await handleWebhook({ id: 'evt_duplicate', type: 'customer.subscription.updated', data: { object: {} } }),
    { status: 'DUPLICATE_IGNORED' }
  );
});
