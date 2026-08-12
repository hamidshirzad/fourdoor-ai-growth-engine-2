import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import pool from '../db/pool.js';
import { signToken } from '../middleware/auth.js';
import { logAgent } from './logService.js';
import { getWorkosClient, WORKOS_CLIENT_ID } from './workosService.js';
import { sendWelcomeEmail } from './emailService.js';

function sanitizeUser(user) {
  const { password_hash, password_reset_token_hash, ...safe } = user;
  return safe;
}

export function deriveNameFromWorkosUser(workosUser) {
  const name = [workosUser.firstName, workosUser.lastName].filter(Boolean).join(' ').trim();
  if (name) return name;
  return (workosUser.email || '').split('@')[0] || 'New User';
}

export function deriveNameFromAuth0User(auth0User) {
  return auth0User.name || auth0User.nickname || (auth0User.email || '').split('@')[0] || 'New User';
}

export async function signup({ name, email, password, company }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, company)
     VALUES ($1, LOWER($2), $3, $4)
     RETURNING *`,
    [name, email, passwordHash, company || null]
  );
  const user = sanitizeUser(result.rows[0]);
  
  // Trigger welcome email asynchronously
  sendWelcomeEmail({ email: user.email, name: user.name, company: user.company }).catch(err => {
    console.error('Background welcome email trigger failed:', err.message);
  });

  return { user, token: signToken(user) };
}

export async function login({ email, password }) {
  const result = await pool.query('SELECT * FROM users WHERE email = LOWER($1)', [email]);
  if (result.rowCount === 0) {
    throw new Error('Invalid email or password');
  }

  const user = result.rows[0];
  // SSO-only users have no local password; same generic error as a mismatch.
  if (!user.password_hash) {
    throw new Error('Invalid email or password');
  }
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('Invalid email or password');
  }

  const safeUser = sanitizeUser(user);
  return { user: safeUser, token: signToken(safeUser) };
}

export async function findOrCreateWorkosUser(workosUser) {
  // users.email is UNIQUE NOT NULL; reject clearly instead of letting the DB throw.
  const email = typeof workosUser.email === 'string' ? workosUser.email.trim() : '';
  if (!email) {
    throw new Error('SSO user is missing an email address');
  }

  const byWorkosId = await pool.query('SELECT * FROM users WHERE workos_id = $1', [workosUser.id]);
  let row = byWorkosId.rows[0];

  if (!row) {
    // Atomic upsert keyed on email: creates the user or links an existing
    // email-matched account, safe under concurrent callbacks.
    try {
      const upserted = await pool.query(
        `INSERT INTO users (name, email, workos_id)
         VALUES ($1, LOWER($2), $3)
         ON CONFLICT (email) DO UPDATE
           SET workos_id = EXCLUDED.workos_id, updated_at = NOW()
         RETURNING *`,
        [deriveNameFromWorkosUser(workosUser), email, workosUser.id]
      );
      row = upserted.rows[0];
    } catch (err) {
      // A concurrent callback for the same WorkOS user can still race the
      // unique workos_id constraint; the row exists now, so re-read it.
      if (err.code !== '23505') throw err;
      const retry = await pool.query('SELECT * FROM users WHERE workos_id = $1', [workosUser.id]);
      if (retry.rowCount === 0) throw err;
      row = retry.rows[0];
    }
  }

  const user = sanitizeUser(row);
  await logAgent(user.id, 'auth', 'sso_login', 'success', { workosId: workosUser.id }, { email: user.email });
  return { user, token: signToken(user) };
}

export async function findOrCreateAuth0User(auth0User) {
  const email = typeof auth0User.email === 'string' ? auth0User.email.trim() : '';
  if (!auth0User.sub) throw new Error('Auth0 user is missing a subject identifier');
  if (!email) throw new Error('Auth0 user is missing an email address');
  if (auth0User.email_verified !== true) throw new Error('Auth0 email address is not verified');
  const upserted = await pool.query(
    `INSERT INTO users (name, email, auth0_id) VALUES ($1, LOWER($2), $3)
     ON CONFLICT (email) DO UPDATE SET auth0_id = EXCLUDED.auth0_id, updated_at = NOW()
     RETURNING *`,
    [deriveNameFromAuth0User(auth0User), email, auth0User.sub]
  );
  const user = sanitizeUser(upserted.rows[0]);
  await logAgent(user.id, 'auth', 'auth0_login', 'success', { auth0Id: auth0User.sub }, { email: user.email });
  return { user, token: signToken(user) };
}

// Full SSO callback workflow (code exchange + user upsert + token issuance),
// kept out of the route handler so the route stays a thin transport layer.
export async function loginWithWorkosCode(code) {
  const auth = await getWorkosClient().userManagement.authenticateWithCode({
    code,
    clientId: WORKOS_CLIENT_ID
  });
  return findOrCreateWorkosUser(auth.user);
}

export async function createPasswordReset(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 30);
  const result = await pool.query(
    `UPDATE users
     SET password_reset_token_hash = $1, password_reset_expires_at = $2, updated_at = NOW()
     WHERE email = LOWER($3)
     RETURNING id, email`,
    [tokenHash, expires, email]
  );

  return {
    sent: result.rowCount > 0,
    resetToken: process.env.NODE_ENV === 'production' ? undefined : token
  };
}

export async function resetPassword({ token, password }) {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1,
         password_reset_token_hash = NULL,
         password_reset_expires_at = NULL,
         updated_at = NOW()
     WHERE password_reset_token_hash = $2
       AND password_reset_expires_at > NOW()
     RETURNING id`,
    [passwordHash, tokenHash]
  );
  if (result.rowCount === 0) {
    throw new Error('Invalid or expired reset token');
  }
  return { success: true };
}

export async function updateOnboarding(userId, newOnboarding) {
  const userRes = await pool.query('SELECT name, email, company, onboarding FROM users WHERE id = $1', [userId]);
  const userRow = userRes.rows[0];
  const current = userRow?.onboarding || {};
  const merged = typeof current === 'string' ? JSON.parse(current) : current;
  const updatedOnboarding = { ...merged, ...newOnboarding };

  const result = await pool.query(
    `UPDATE users SET onboarding = $2::jsonb, updated_at = NOW()
     WHERE id = $1 RETURNING id, name, email, company, role, plan, subscription_status, onboarding`,
    [userId, JSON.stringify(updatedOnboarding)]
  );
  const updatedUser = result.rows[0];

  // If newly completed onboarding, send welcome email
  if ((!current || Object.keys(current).length === 0) && updatedUser?.email) {
    sendWelcomeEmail({ email: updatedUser.email, name: updatedUser.name, company: updatedUser.company }).catch((err) => {
      console.error('Onboarding welcome email trigger failed:', err.message);
    });
  }

  return updatedUser;
}
