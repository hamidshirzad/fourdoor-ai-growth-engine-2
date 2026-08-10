import Stripe from 'stripe';
import pool from '../db/pool.js';

// Stripe follows the same graceful-degradation rule as the other optional
// integrations: unset credentials must never crash the app at import time.
// It differs in one way that matters — billing is not allowed to *silently*
// degrade. Every entry point below throws a "not configured" error rather than
// pretending a subscription happened, because the previous implementation
// marked users as paying customers when no payment had been taken.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripeClient = null;
let database = pool;

export function isStripeEnabled() {
  return Boolean(STRIPE_SECRET_KEY);
}

export function getStripeClient() {
  if (stripeClient) return stripeClient;
  if (!STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
  }
  stripeClient = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  return stripeClient;
}

// Prices live in the Stripe dashboard; only the price id belongs in env.
// Amounts here are display copy for the pricing UI and are never used to
// charge — Stripe charges whatever the price id says.
export const plans = {
  starter: {
    key: 'starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    name: 'Starter',
    price: 29,
    currency: 'EUR',
    features: ['30 AI posts/month', '2 social accounts', 'Lead capture', 'Core analytics']
  },
  pro: {
    key: 'pro',
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    name: 'Pro',
    price: 79,
    currency: 'EUR',
    features: ['180 AI posts/month', '6 social accounts', 'AI engagement', 'Cold outreach', 'Optimization agent']
  },
  agency: {
    key: 'agency',
    priceId: process.env.STRIPE_AGENCY_PRICE_ID,
    name: 'Agency',
    price: 199,
    currency: 'EUR',
    features: ['1000 AI posts/month', '25 social accounts', 'Agency lead inbox', 'Priority automation', 'Advanced reporting']
  }
};

export function getPlans() {
  // Never leak price ids to the browser.
  return Object.fromEntries(
    Object.entries(plans).map(([key, plan]) => {
      const { priceId, ...publicFields } = plan;
      return [key, { ...publicFields, configured: Boolean(priceId) }];
    })
  );
}

export function getPlanFeatures(planName) {
  return plans[planName] || plans.starter;
}

async function getOrCreateCustomer(stripe, userId) {
  const { rows } = await database.query(
    'SELECT id, email, name, stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );
  const user = rows[0];
  if (!user) throw new Error('User not found');

  if (user.stripe_customer_id) return user.stripe_customer_id;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id }
  });

  await database.query(
    'UPDATE users SET stripe_customer_id = $1, updated_at = NOW() WHERE id = $2',
    [customer.id, userId]
  );
  return customer.id;
}

/**
 * Creates a Stripe Checkout Session for a subscription.
 *
 * Hosted Checkout is used rather than an in-app card form so no card data ever
 * reaches this application. The user's plan is deliberately NOT changed here —
 * creating a session means the user has started checkout, not paid. Activation
 * happens only in handleWebhook(), against a signature-verified Stripe event.
 */
export async function createCheckoutSession(userId, planName, successUrl, cancelUrl) {
  const plan = plans[planName];
  if (!plan) throw new Error('Invalid plan');
  if (!plan.priceId) {
    throw new Error(`Stripe is not configured for the ${planName} plan. Set STRIPE_${planName.toUpperCase()}_PRICE_ID.`);
  }

  const stripe = getStripeClient();
  const customerId = await getOrCreateCustomer(stripe, userId);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    // Both the session and the resulting subscription carry the ids we need to
    // match a webhook back to a user without trusting anything client-supplied.
    client_reference_id: userId,
    metadata: { userId, plan: planName },
    subscription_data: { metadata: { userId, plan: planName } },
    success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${cancelUrl || successUrl}${(cancelUrl || successUrl).includes('?') ? '&' : '?'}checkout=cancelled`,
    allow_promotion_codes: true
  });

  return { id: session.id, checkoutUrl: session.url, status: 'pending' };
}

/**
 * Opens the Stripe billing portal so users can update cards, or cancel.
 * Cancellation flows back through the webhook like every other state change.
 */
export async function createBillingPortalSession(userId, returnUrl) {
  const stripe = getStripeClient();
  const { rows } = await database.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
  const customerId = rows[0]?.stripe_customer_id;
  if (!customerId) throw new Error('No billing account exists for this user yet.');

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl
  });
  return { url: session.url };
}

/**
 * Verifies the Stripe signature over the RAW request body.
 * Throws when the signature does not match — the caller must reject the
 * request. There is deliberately no "skip when unconfigured" path: an
 * unverified webhook can change what a customer is charged for.
 */
export function constructWebhookEvent(rawBody, signature) {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhooks are not configured. Set STRIPE_WEBHOOK_SECRET.');
  }
  if (!signature) {
    throw new Error('Missing stripe-signature header');
  }
  return getStripeClient().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
}

// Stripe subscription status -> the app's own subscription_status vocabulary.
const STATUS_MAP = {
  active: 'active',
  trialing: 'active',
  past_due: 'past_due',
  unpaid: 'past_due',
  incomplete: 'pending',
  incomplete_expired: 'cancelled',
  canceled: 'cancelled',
  paused: 'cancelled'
};

function planFromPriceId(priceId) {
  const match = Object.values(plans).find((plan) => plan.priceId && plan.priceId === priceId);
  return match?.key || null;
}

async function alreadyProcessed(eventId) {
  const { rowCount } = await database.query(
    `SELECT 1 FROM processed_webhook_events WHERE id = $1 AND provider = 'stripe'`,
    [eventId]
  );
  return rowCount > 0;
}

async function markProcessed(eventId, eventType) {
  await database.query(
    `INSERT INTO processed_webhook_events (id, provider, event_type)
     VALUES ($1, 'stripe', $2)
     ON CONFLICT (id) DO NOTHING`,
    [eventId, eventType]
  );
}

async function applySubscription(subscription) {
  const userId = subscription.metadata?.userId || null;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planName = planFromPriceId(priceId) || subscription.metadata?.plan || null;
  const status = STATUS_MAP[subscription.status] || 'inactive';

  // Match on the ids Stripe owns, never on anything a client could forge.
  // The plan only moves when Stripe told us which price is being billed.
  const { rowCount } = await database.query(
    `UPDATE users
     SET subscription_status = $1,
         stripe_subscription_id = $2,
         plan = COALESCE($3, plan),
         updated_at = NOW()
     WHERE ($4::text IS NOT NULL AND id::text = $4::text)
        OR ($5::text IS NOT NULL AND stripe_customer_id = $5::text)`,
    [status, subscription.id, planName, userId, customerId || null]
  );

  if (rowCount === 0) {
    console.warn('[stripe] No user matched subscription', subscription.id);
  }
  return { subscriptionStatus: status, plan: planName, matched: rowCount };
}

export async function handleWebhook(event) {
  if (await alreadyProcessed(event.id)) {
    return { status: 'DUPLICATE_IGNORED' };
  }

  const object = event.data?.object || {};
  let result;

  switch (event.type) {
    case 'checkout.session.completed': {
      // A completed session with an unpaid status is not a sale yet; the
      // subscription.* events below carry the authoritative state.
      if (object.payment_status !== 'paid' && object.status !== 'complete') {
        result = { status: 'IGNORED', reason: 'session not paid' };
        break;
      }
      if (object.subscription) {
        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(
          typeof object.subscription === 'string' ? object.subscription : object.subscription.id
        );
        result = { status: 'OK', ...(await applySubscription(subscription)) };
        break;
      }
      result = { status: 'IGNORED', reason: 'no subscription on session' };
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      result = { status: 'OK', ...(await applySubscription(object)) };
      break;

    case 'invoice.payment_failed': {
      const customerId = typeof object.customer === 'string' ? object.customer : object.customer?.id;
      if (customerId) {
        await database.query(
          `UPDATE users SET subscription_status = 'past_due', updated_at = NOW()
           WHERE stripe_customer_id = $1`,
          [customerId]
        );
      }
      result = { status: 'OK' };
      break;
    }

    default:
      result = { status: 'IGNORED', reason: `unhandled event ${event.type}` };
  }

  // Record delivery only after every side effect succeeds. Stripe retries
  // non-2xx webhooks; claiming the event first made a transient database/API
  // failure permanently suppress the retry and leave billing state stale.
  await markProcessed(event.id, event.type);
  return result;
}

export function __setStripeDependenciesForTests({ stripe, db } = {}) {
  stripeClient = stripe ?? null;
  database = db ?? pool;
}

export function __resetStripeDependenciesForTests() {
  stripeClient = null;
  database = pool;
}
