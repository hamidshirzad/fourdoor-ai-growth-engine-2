import axios from 'axios';
import pool from '../db/pool.js';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const plans = {
  starter: {
    key: 'starter',
    planId: process.env.PAYPAL_STARTER_PLAN_ID,
    name: 'Starter',
    price: 29,
    currency: 'EUR',
    features: ['30 AI posts/month', '2 social accounts', 'Lead capture', 'Core analytics']
  },
  pro: {
    key: 'pro',
    planId: process.env.PAYPAL_PRO_PLAN_ID,
    name: 'Pro',
    price: 79,
    currency: 'EUR',
    features: ['180 AI posts/month', '6 social accounts', 'AI engagement', 'Cold outreach', 'Optimization agent']
  },
  agency: {
    key: 'agency',
    planId: process.env.PAYPAL_AGENCY_PLAN_ID,
    name: 'Agency',
    price: 199,
    currency: 'EUR',
    features: ['1000 AI posts/month', '25 social accounts', 'Agency lead inbox', 'Priority automation', 'Advanced reporting']
  }
};

async function paypalToken() {
  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('PayPal credentials are not configured');
  }
  const response = await axios.post(
    `${PAYPAL_API}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: {
        username: process.env.PAYPAL_CLIENT_ID,
        password: process.env.PAYPAL_CLIENT_SECRET
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );
  return response.data.access_token;
}

/**
 * Starts a PayPal subscription and returns its approval URL.
 *
 * This function used to fall back to marking the user `active` on a hardcoded
 * checkout link whenever PayPal was unconfigured or the API call failed, which
 * handed out paid plans for free. There is no fallback now: if PayPal cannot
 * create a real subscription, this throws and the user's plan is untouched.
 * Even on success the status is only `pending` — `handleWebhook()` promotes it
 * to `active` once PayPal confirms the money.
 */
export async function createSubscription(userId, planName, returnUrl, cancelUrl) {
  const plan = plans[planName];
  if (!plan) throw new Error('Invalid plan');
  if (!plan.planId) {
    throw new Error(`PayPal is not configured for the ${planName} plan. Set PAYPAL_${planName.toUpperCase()}_PLAN_ID.`);
  }

  const token = await paypalToken();
  const response = await axios.post(`${PAYPAL_API}/v1/billing/subscriptions`, {
    plan_id: plan.planId,
    custom_id: userId,
    application_context: {
      brand_name: 'Fourdoor AI Growth Engine',
      locale: 'en-US',
      shipping_preference: 'NO_SHIPPING',
      user_action: 'SUBSCRIBE_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl || returnUrl
    }
  }, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  const approveUrl = response.data.links?.find((link) => link.rel === 'approve')?.href;
  if (!approveUrl) throw new Error('PayPal did not return an approval URL');

  await pool.query(
    `UPDATE users
     SET plan = $1, subscription_status = 'pending', paypal_subscription_id = $2, updated_at = NOW()
     WHERE id = $3`,
    [planName, response.data.id, userId]
  );

  return { id: response.data.id, approveUrl, status: 'pending' };
}

/**
 * Verifies a PayPal webhook signature.
 *
 * Returns `{ verified: false }` when PAYPAL_WEBHOOK_ID is unset. It used to
 * return `{ skipped: true }`, which the route treated as permission to
 * proceed — leaving an unauthenticated endpoint that could move any account
 * onto a paid plan by posting a forged event. Callers must reject anything
 * that is not `verified: true`.
 */
export async function verifyWebhook(headers, body) {
  if (!process.env.PAYPAL_WEBHOOK_ID) {
    return { verified: false, reason: 'PAYPAL_WEBHOOK_ID is not configured' };
  }
  const token = await paypalToken();
  const response = await axios.post(`${PAYPAL_API}/v1/notifications/verify-webhook-signature`, {
    auth_algo: headers['paypal-auth-algo'],
    cert_url: headers['paypal-cert-url'],
    transmission_id: headers['paypal-transmission-id'],
    transmission_sig: headers['paypal-transmission-sig'],
    transmission_time: headers['paypal-transmission-time'],
    webhook_id: process.env.PAYPAL_WEBHOOK_ID,
    webhook_event: body
  }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return { verified: response.data.verification_status === 'SUCCESS' };
}

export async function handleWebhook(event) {
  const type = event.event_type;
  const resource = event.resource || {};
  const subscriptionId = resource.id;
  const userId = resource.custom_id || resource.custom;

  // Only ACTIVATED means PayPal has taken the money. CREATED fires when the
  // subscription record exists but has not been approved or paid, so treating
  // it as active granted the plan before any payment.
  if (type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    await pool.query(
      `UPDATE users
       SET subscription_status = 'active', paypal_subscription_id = $1, updated_at = NOW()
       WHERE paypal_subscription_id = $1
          OR ($2::uuid IS NOT NULL AND id = $2::uuid)`,
      [subscriptionId, userId || null]
    );
  }

  if (['BILLING.SUBSCRIPTION.CANCELLED', 'BILLING.SUBSCRIPTION.SUSPENDED', 'BILLING.SUBSCRIPTION.EXPIRED'].includes(type)) {
    await pool.query(
      `UPDATE users SET subscription_status = 'cancelled', updated_at = NOW()
       WHERE paypal_subscription_id = $1`,
      [subscriptionId]
    );
  }

  if (['PAYMENT.SALE.DENIED', 'BILLING.SUBSCRIPTION.PAYMENT.FAILED'].includes(type)) {
    await pool.query(
      `UPDATE users SET subscription_status = 'failed', updated_at = NOW()
       WHERE paypal_subscription_id = $1`,
      [subscriptionId || resource.billing_agreement_id]
    );
  }

  return { status: 'RECEIVED' };
}

export function getPlanFeatures(planName) {
  return plans[planName] || plans.starter;
}

export function getPlans() {
  return plans;
}
