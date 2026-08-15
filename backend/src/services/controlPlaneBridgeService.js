import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import {
  activateCampaignAutomation,
  deactivateCampaignAutomation
} from './automationService.js';

const ACTIVE_STATES = new Set(['active', 'trialing']);
const PLAN_ORDER = ['starter', 'pro', 'agency'];

function normalizePlan(plan) {
  return PLAN_ORDER.includes(plan) ? plan : 'starter';
}

function automationAllowed(plan, subscriptionStatus) {
  return ACTIVE_STATES.has(subscriptionStatus) && (plan === 'pro' || plan === 'agency');
}

async function resolveOrProvisionUser(client, identity, { requireActive = false } = {}) {
  const provider = identity.provider || 'firebase';
  const subject = String(identity.subject || '').trim();
  const email = String(identity.email || '').trim().toLowerCase();
  const emailVerified = identity.emailVerified === true;
  const subscriptionStatus = String(identity.subscriptionStatus || 'inactive');
  const plan = normalizePlan(identity.plan);

  if (!subject || !email || !emailVerified) {
    const error = new Error('Verified external identity is required');
    error.status = 400;
    throw error;
  }
  if (requireActive && !automationAllowed(plan, subscriptionStatus)) {
    const error = new Error('Pro or Agency automation entitlement is required');
    error.status = ACTIVE_STATES.has(subscriptionStatus) ? 403 : 402;
    throw error;
  }

  const mapped = await client.query(
    `SELECT u.*
     FROM external_identities e
     JOIN users u ON u.id = e.user_id
     WHERE e.provider = $1 AND e.subject = $2`,
    [provider, subject]
  );

  let user = mapped.rows[0] || null;
  if (!user) {
    const byEmail = await client.query('SELECT * FROM users WHERE lower(email) = $1', [email]);
    user = byEmail.rows[0] || null;

    if (!user) {
      const passwordHash = await bcrypt.hash(crypto.randomBytes(48).toString('hex'), 12);
      const inserted = await client.query(
        `INSERT INTO users (name, email, password_hash, plan, subscription_status, company)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          String(identity.name || email.split('@')[0]).slice(0, 255),
          email,
          passwordHash,
          plan,
          subscriptionStatus,
          identity.company ? String(identity.company).slice(0, 255) : null
        ]
      );
      user = inserted.rows[0];
    }

    await client.query(
      `INSERT INTO external_identities (provider, subject, user_id, verified_email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (provider, subject) DO UPDATE
       SET verified_email = EXCLUDED.verified_email, updated_at = NOW()`,
      [provider, subject, user.id, email]
    );
  }

  const updated = await client.query(
    `UPDATE users
     SET name = COALESCE($1, name),
         company = COALESCE($2, company),
         plan = $3,
         subscription_status = $4,
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      identity.name ? String(identity.name).slice(0, 255) : null,
      identity.company ? String(identity.company).slice(0, 255) : null,
      plan,
      subscriptionStatus,
      user.id
    ]
  );

  return updated.rows[0];
}

async function pauseExternalAutomation(client, userId) {
  const campaigns = await client.query(
    `UPDATE campaigns
     SET status = 'paused', next_run_at = NULL, updated_at = NOW()
     WHERE user_id = $1 AND external_source = 'fourdooraiops' AND status = 'active'
     RETURNING id`,
    [userId]
  );

  await client.query(
    `UPDATE automation_jobs j
     SET status = 'cancelled', updated_at = NOW()
     WHERE j.user_id = $1
       AND j.status = 'pending'
       AND EXISTS (
         SELECT 1 FROM campaigns c
         WHERE c.id = j.campaign_id AND c.external_source = 'fourdooraiops'
       )`,
    [userId]
  );

  return campaigns.rowCount;
}

async function upsertExternalCampaign(client, userId, campaign) {
  const externalId = String(campaign.externalId || '').trim();
  if (!externalId) {
    const error = new Error('Campaign externalId is required');
    error.status = 400;
    throw error;
  }

  const result = await client.query(
    `INSERT INTO campaigns (
       user_id, name, niche, audience, goal, tone, cadence, status,
       channels, external_source, external_id, next_run_at
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,'paused',$8::jsonb,'fourdooraiops',$9,NULL)
     ON CONFLICT (user_id, external_source, external_id)
     DO UPDATE SET
       name = EXCLUDED.name,
       niche = EXCLUDED.niche,
       audience = EXCLUDED.audience,
       goal = EXCLUDED.goal,
       tone = EXCLUDED.tone,
       cadence = EXCLUDED.cadence,
       channels = EXCLUDED.channels,
       updated_at = NOW()
     RETURNING *`,
    [
      userId,
      String(campaign.name || 'Fourdoor campaign').slice(0, 255),
      String(campaign.niche || 'general').slice(0, 255),
      String(campaign.audience || 'target audience'),
      String(campaign.goal || 'grow qualified demand'),
      String(campaign.tone || 'clear, direct, helpful').slice(0, 100),
      ['hourly', 'daily', 'weekly'].includes(campaign.cadence) ? campaign.cadence : 'daily',
      JSON.stringify(Array.isArray(campaign.channels) ? campaign.channels.slice(0, 20) : []),
      externalId
    ]
  );
  return result.rows[0];
}

export async function syncControlPlaneEntitlement(payload) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await resolveOrProvisionUser(client, payload.identity || {});
    const allowed = automationAllowed(user.plan, user.subscription_status);
    const pausedCampaigns = allowed ? 0 : await pauseExternalAutomation(client, user.id);
    await client.query('COMMIT');
    return {
      growthEngineUserId: user.id,
      plan: user.plan,
      subscriptionStatus: user.subscription_status,
      automationAllowed: allowed,
      pausedCampaigns
    };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function syncControlPlaneCampaign(payload) {
  const client = await pool.connect();
  let user;
  let campaign;
  try {
    await client.query('BEGIN');
    user = await resolveOrProvisionUser(client, payload.identity || {}, { requireActive: true });
    campaign = await upsertExternalCampaign(client, user.id, payload.campaign || {});
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  const active = payload.campaign?.active !== false;
  const result = active
    ? await activateCampaignAutomation(user.id, campaign.id, {
        objective: payload.campaign?.goal,
        targetAudience: payload.campaign?.audience,
        budgetRange: payload.campaign?.budgetRange,
        channels: payload.campaign?.channels,
        cadence: payload.campaign?.cadence
      })
    : await deactivateCampaignAutomation(user.id, campaign.id);

  return {
    growthEngineUserId: user.id,
    campaignId: campaign.id,
    externalCampaignId: payload.campaign.externalId,
    active,
    ...result
  };
}
