import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

// Fail fast in production rather than signing tokens with a weak key.
const configuredSecret = process.env.JWT_SECRET || '';
if (process.env.NODE_ENV === 'production' && configuredSecret.length < 32) {
  throw new Error('JWT_SECRET must be set to at least 32 characters in production');
}
if (configuredSecret && configuredSecret.length < 32) {
  console.warn('JWT_SECRET is shorter than 32 characters; use a longer secret');
}
if (!configuredSecret) {
  console.warn('JWT_SECRET is not set; using a random ephemeral secret — tokens will not survive restarts');
}

// No hardcoded fallback: outside production an unset secret becomes a random
// per-process value, so a known weak key can never sign tokens.
export const JWT_SECRET = configuredSecret || crypto.randomBytes(48).toString('hex');

export async function authenticateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const result = await pool.query(
      'SELECT id, name, email, company, role, plan, subscription_status, onboarding FROM users WHERE id = $1',
      [payload.sub]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = result.rows[0];
    req.userId = result.rows[0].id;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, plan: user.plan },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}
