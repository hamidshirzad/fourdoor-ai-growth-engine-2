import crypto from 'crypto';
import express from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';
import { signup, login, createPasswordReset, resetPassword, updateOnboarding, loginWithWorkosCode, findOrCreateAuth0User } from '../services/authService.js';
import { getWorkosClient, isSsoEnabled, WORKOS_CLIENT_ID } from '../services/workosService.js';
import { AUTH0_CLIENT_ID, authenticateWithAuth0Code, getAuth0AuthorizationUrl, isAuth0Enabled } from '../services/auth0Service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../utils/validate.js';

const router = express.Router();

function frontendUrl() {
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL;
  return (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')[0].trim();
}

function ssoRedirectUri() {
  return process.env.WORKOS_REDIRECT_URI || 'http://localhost:5000/api/auth/sso/callback';
}

function auth0RedirectUri() {
  return process.env.AUTH0_REDIRECT_URI || 'http://localhost:5000/api/auth/auth0/callback';
}

function readCookie(req, name) {
  const match = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

const ssoCallbackSchema = z.object({
  code: z.string().min(1).max(1024),
  state: z.string().min(1).max(2048)
});

const signupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  company: z.string().max(255).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

router.post('/signup', validate(signupSchema), asyncHandler(async (req, res) => {
  const result = await signup(req.body);
  res.status(201).json(result);
}));

router.post('/login', validate(loginSchema), asyncHandler(async (req, res) => {
  const result = await login(req.body);
  res.json(result);
}));

router.get('/profile', authenticateToken, (req, res) => {
  res.json(req.user);
});

router.get('/sso/authorize', (req, res) => {
  if (!isSsoEnabled()) {
    return res.status(503).json({ error: 'SSO is not configured. Set WORKOS_API_KEY and WORKOS_CLIENT_ID.' });
  }
  // CSRF protection: a signed short-lived state carrying a nonce that is also
  // stored in an httpOnly cookie, binding the callback to this browser.
  const nonce = crypto.randomUUID();
  const state = jwt.sign({ purpose: 'sso', nonce }, JWT_SECRET, { expiresIn: '5m' });
  res.cookie('sso_nonce', nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 5 * 60 * 1000
  });
  const authorizationUrl = getWorkosClient().userManagement.getAuthorizationUrl({
    provider: 'authkit',
    clientId: WORKOS_CLIENT_ID,
    redirectUri: ssoRedirectUri(),
    state
  });
  res.redirect(authorizationUrl);
});

router.get('/sso/callback', async (req, res) => {
  const front = frontendUrl();
  try {
    if (!isSsoEnabled()) throw new Error('SSO is not configured');
    const parsed = ssoCallbackSchema.safeParse(req.query);
    if (!parsed.success) throw new Error('Invalid code or state parameter');
    const { code, state } = parsed.data;

    const payload = jwt.verify(state, JWT_SECRET);
    const cookieNonce = readCookie(req, 'sso_nonce');
    if (!cookieNonce || payload.nonce !== cookieNonce) {
      throw new Error('State nonce does not match the initiating browser');
    }
    res.clearCookie('sso_nonce');

    const { token } = await loginWithWorkosCode(code);
    // Token in the URL fragment so it never reaches server logs.
    res.redirect(`${front}/sso-callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('SSO callback failed:', err.message);
    res.redirect(`${front}/login?error=sso_failed`);
  }
});

router.get('/auth0/authorize', (req, res) => {
  if (!isAuth0Enabled()) return res.status(503).json({ error: 'Auth0 is not configured.' });
  const nonce = crypto.randomUUID();
  const verifier = crypto.randomBytes(48).toString('base64url');
  const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
  const state = jwt.sign({ purpose: 'auth0', nonce, clientId: AUTH0_CLIENT_ID }, JWT_SECRET, { expiresIn: '5m' });
  const options = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 5 * 60 * 1000 };
  res.cookie('auth0_nonce', nonce, options);
  res.cookie('auth0_pkce', verifier, options);
  res.redirect(getAuth0AuthorizationUrl({ redirectUri: auth0RedirectUri(), state, codeChallenge: challenge }));
});

router.get('/auth0/callback', async (req, res) => {
  const front = frontendUrl();
  try {
    const parsed = ssoCallbackSchema.safeParse(req.query);
    if (!parsed.success) throw new Error('Invalid code or state parameter');
    const payload = jwt.verify(parsed.data.state, JWT_SECRET);
    const cookieNonce = readCookie(req, 'auth0_nonce');
    const codeVerifier = readCookie(req, 'auth0_pkce');
    if (payload.purpose !== 'auth0' || payload.clientId !== AUTH0_CLIENT_ID || !cookieNonce || payload.nonce !== cookieNonce) {
      throw new Error('State nonce does not match the initiating browser');
    }
    if (!codeVerifier) throw new Error('PKCE verifier is missing');
    res.clearCookie('auth0_nonce');
    res.clearCookie('auth0_pkce');
    const profile = await authenticateWithAuth0Code({ code: parsed.data.code, redirectUri: auth0RedirectUri(), codeVerifier });
    const { token } = await findOrCreateAuth0User(profile);
    res.redirect(`${front}/sso-callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Auth0 callback failed:', err.message);
    res.redirect(`${front}/login?error=auth0_failed`);
  }
});

router.post('/password/forgot', validate(z.object({ email: z.string().email() })), asyncHandler(async (req, res) => {
  const result = await createPasswordReset(req.body.email);
  res.json({ success: true, resetToken: result.resetToken });
}));

router.post('/password/reset', validate(z.object({
  token: z.string().min(20),
  password: z.string().min(8)
})), asyncHandler(async (req, res) => {
  res.json(await resetPassword(req.body));
}));

router.put('/onboarding', authenticateToken, validate(z.object({
  niche: z.string().min(2).optional(),
  audience: z.string().min(2).optional(),
  goal: z.string().min(2).optional(),
  connectedSocials: z.array(z.string()).optional()
})), asyncHandler(async (req, res) => {
  const user = await updateOnboarding(req.userId, req.body);
  res.json(user);
}));

export default router;
