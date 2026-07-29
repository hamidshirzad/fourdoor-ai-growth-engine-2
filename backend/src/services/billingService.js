import axios from 'axios';
import pool from '../db/pool.js';

const PAYPAL_API = process.env.PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const plans = {
  starter: {
    key: 'starter',
    planId: process.env.PAYPAL_STARTER_PLAN_ID || 'P-STARTER-DEFAULT',
    name: 'Starter',
    price: 29,
    currency: 'EUR',
    features: ['30 AI posts/month', '2 social accounts', 'Lead capture', 'Core analytics']
  },
  pro: {
    key: 'pro',
    planId: process.env.PAYPAL_PRO_PLAN_ID || 'P-PRO-DEFAULT',
    name: 'Pro',
    price: 79,
    currency: 'EUR',
    features: ['180 AI posts/month', '6 social accounts', 'AI engagement', 'Cold outreach', 'Optimization agent']
  },
  agency: {
    key: 'agency',
    planId: process.env.PAYPAL_AGENCY_PLAN_ID || 'P-AGENCY-DEFAULT',
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

export async function createSubscription(userId, planName, returnUrl, cancelUrl) {
  const plan = plans[planName];
  if (!plan) throw new Error('Invalid plan');

  let approveUrl = 'https://buy.stripe.com/aFacN448U93efM6dAP7Re01';
  let subId = `sub_${planName}_${Date.now()}`;
  let subStatus = 'active';

  if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env[`PAYPAL_${planName.toUpperCase()}_PLAN_ID`]) {
    try {
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

      subId = response.data.id;
      approveUrl = response.data.links?.find((link) => link.rel === 'approve')?.href || approveUrl;
      subStatus = 'pending';
    } catch (err) {
      console.warn('PayPal subscription endpoint error, using direct checkout fallback:', err.message);
      approveUrl = returnUrl || approveUrl;
    }
  } else {
    // Direct Stripe / Fallback subscription activation when PayPal is unconfigured
    approveUrl = returnUrl || approveUrl;
  }

  await pool.query(
    `UPDATE users
     SET plan = $1, subscription_status = $2, paypal_subscription_id = $3, updated_at = NOW()
     WHERE id = $4`,
    [planName, subStatus, subId, userId]
  );

  return { id: subId, approveUrl, status: subStatus };
}

export async function verifyWebhook(headers, body) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return { verified: false, skipped: true };
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

  if (['BILLING.SUBSCRIPTION.ACTIVATED', 'BILLING.SUBSCRIPTION.CREATED'].includes(type)) {
    await pool.query(
      `UPDATE users
       SET subscription_status = 'active', paypal_subscription_id = $1, updated_at = NOW()
       WHERE id::text = $2 OR paypal_subscription_id = $1`,
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
