import express from 'express';
import { z } from 'zod';
import {
  createSubscription as createPaypalSubscription,
  handleWebhook as handlePaypalWebhook,
  verifyWebhook as verifyPaypalWebhook
} from '../services/billingService.js';
import {
  createBillingPortalSession,
  createCheckoutSession,
  constructWebhookEvent,
  getPlans,
  handleWebhook as handleStripeWebhook,
  isStripeEnabled
} from '../services/stripeService.js';
import { authenticateToken } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

export function validateBillingReturnUrl(value, allowedOrigins = null) {
  const url = new URL(value);
  const configuredOrigins = allowedOrigins || [
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ORIGIN || '').split(',')
  ].filter(Boolean).map((origin) => new URL(origin.trim()).origin);

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push('http://localhost:3000');
  }
  if (!configuredOrigins.includes(url.origin)) {
    const error = new Error('Billing return URL must use an approved frontend origin.');
    error.status = 400;
    throw error;
  }
  return url.toString();
}

const subscribeSchema = z.object({
  plan: z.enum(['starter', 'pro', 'agency']),
  returnUrl: z.string().url(),
  cancelUrl: z.string().url().optional(),
  provider: z.enum(['stripe', 'paypal']).optional()
});

/**
 * Starts a checkout. Stripe is the default; PayPal stays available for
 * accounts already subscribed through it.
 *
 * The response shape is provider-agnostic on purpose — the frontend only ever
 * redirects the browser to `subscription.approveUrl`. Neither branch grants a
 * plan here; that happens in the webhook once the provider confirms payment.
 */
router.post('/subscribe', authenticateToken, validate(subscribeSchema), asyncHandler(async (req, res) => {
  const { plan, returnUrl, cancelUrl, provider } = req.body;
  const chosen = provider || (isStripeEnabled() ? 'stripe' : 'paypal');
  const approvedReturnUrl = validateBillingReturnUrl(returnUrl);
  const approvedCancelUrl = cancelUrl ? validateBillingReturnUrl(cancelUrl) : approvedReturnUrl;

  if (chosen === 'stripe') {
    const session = await createCheckoutSession(req.userId, plan, approvedReturnUrl, approvedCancelUrl);
    return res.status(201).json({
      success: true,
      provider: 'stripe',
      subscription: { id: session.id, approveUrl: session.checkoutUrl, status: session.status }
    });
  }

  const subscription = await createPaypalSubscription(req.userId, plan, approvedReturnUrl, approvedCancelUrl);
  res.status(201).json({ success: true, provider: 'paypal', subscription });
}));

router.post('/portal', authenticateToken, validate(z.object({
  returnUrl: z.string().url()
})), asyncHandler(async (req, res) => {
  const returnUrl = validateBillingReturnUrl(req.body.returnUrl);
  res.json(await createBillingPortalSession(req.userId, returnUrl));
}));

/**
 * Stripe webhook. `express.raw` is mounted for this exact path in app.js —
 * signature verification is computed over the unparsed bytes, so a JSON-parsed
 * body would never validate.
 */
router.post('/stripe/webhook', asyncHandler(async (req, res) => {
  let event;
  try {
    event = constructWebhookEvent(req.body, req.headers['stripe-signature']);
  } catch (err) {
    console.error('[stripe] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid Stripe webhook signature' });
  }
  res.json(await handleStripeWebhook(event));
}));

router.post('/webhook', asyncHandler(async (req, res) => {
  // Anything short of a positive verification is rejected. An unverified
  // event is indistinguishable from one an attacker wrote.
  const verification = await verifyPaypalWebhook(req.headers, req.body);
  if (!verification.verified) {
    console.error('[paypal] Webhook rejected:', verification.reason || 'signature mismatch');
    return res.status(400).json({ error: 'Invalid PayPal webhook signature' });
  }
  res.json(await handlePaypalWebhook(req.body));
}));

router.get('/plans', (req, res) => {
  res.json(getPlans());
});

export default router;
