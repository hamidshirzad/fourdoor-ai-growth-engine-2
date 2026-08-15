import crypto from 'node:crypto';
import pool from '../db/pool.js';

const MAX_SKEW_SECONDS = 300;

function safeEqualHex(left, right) {
  try {
    const a = Buffer.from(left, 'hex');
    const b = Buffer.from(right, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function verifyControlPlaneRequest(req, res, next) {
  try {
    const secret = process.env.FOURDOOR_INTERNAL_SHARED_SECRET || '';
    if (secret.length < 32) {
      return res.status(503).json({ error: 'Internal bridge is not configured' });
    }

    const timestamp = req.header('x-fourdoor-timestamp') || '';
    const nonce = req.header('x-fourdoor-nonce') || '';
    const signature = req.header('x-fourdoor-signature') || '';
    const timestampNumber = Number(timestamp);

    if (!/^\d{10,13}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,128}$/.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(401).json({ error: 'Invalid internal request authentication' });
    }

    const timestampSeconds = timestamp.length === 13 ? Math.floor(timestampNumber / 1000) : timestampNumber;
    if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > MAX_SKEW_SECONDS) {
      return res.status(401).json({ error: 'Expired internal request' });
    }

    if (!Buffer.isBuffer(req.body)) {
      return res.status(400).json({ error: 'Internal request body must be raw JSON' });
    }

    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${timestamp}.${nonce}.`)
      .update(req.body)
      .digest('hex');

    if (!safeEqualHex(expected, signature)) {
      return res.status(401).json({ error: 'Invalid internal request signature' });
    }

    const nonceResult = await pool.query(
      `INSERT INTO internal_request_nonces (nonce)
       VALUES ($1)
       ON CONFLICT DO NOTHING
       RETURNING nonce`,
      [nonce]
    );
    if (nonceResult.rowCount === 0) {
      return res.status(409).json({ error: 'Internal request replay rejected' });
    }

    // Best-effort cleanup; replay protection only needs to outlive signature skew.
    pool.query(`DELETE FROM internal_request_nonces WHERE created_at < NOW() - INTERVAL '1 day'`).catch(() => {});

    try {
      req.internalBody = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }

    next();
  } catch (error) {
    console.error('Internal bridge authentication failed:', error);
    return res.status(500).json({ error: 'Internal authentication failed' });
  }
}
