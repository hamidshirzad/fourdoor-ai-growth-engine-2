import pool from '../db/pool.js';
import { logAgent } from './logService.js';
import { mirrorAutomationJob } from './firestoreLogService.js';

// The three jobs a campaign mission produces on activation. Kept as data so the
// set is visible in one place and a runner can dispatch on `type`.
export const JOB_TYPES = ['content_creation', 'lead_follow_up', 'performance_review'];

// How far ahead each type is first scheduled, in hours. Content leads because
// the other two operate on what it produces: there is nothing to follow up on
// or review until posts exist.
const FIRST_RUN_OFFSET_HOURS = {
  content_creation: 0,
  lead_follow_up: 4,
  performance_review: 24
};

const CADENCE_HOURS = { hourly: 1, daily: 24, weekly: 168 };

/**
 * Next run time for a cadence, measured from `from`.
 *
 * An unrecognised cadence falls back to daily rather than throwing. `cadence` is
 * a free VARCHAR on a table that predates this feature, so existing rows can
 * hold values this map has never seen — and a scheduler that throws on one bad
 * row stops running for every user.
 */
export function nextRunFor(cadence, from = new Date()) {
  const hours = CADENCE_HOURS[String(cadence || '').toLowerCase()] ?? CADENCE_HOURS.daily;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

async function loadOwnedCampaign(client, userId, campaignId) {
  const { rows } = await client.query(
    'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
    [campaignId, userId]
  );
  if (rows.length === 0) {
    // Identical response whether the campaign belongs to someone else or does
    // not exist, so this cannot be used to probe for valid campaign ids.
    const error = new Error('Campaign not found');
    error.status = 404;
    throw error;
  }
  return rows[0];
}

/**
 * Turn a campaign into a running automation loop.
 *
 * One transaction covers the mission fields, the status flip and all three job
 * inserts. A partial activation would leave the scheduler picking up a campaign
 * with no queue behind it.
 */
export async function activateCampaignAutomation(userId, campaignId, mission = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await loadOwnedCampaign(client, userId, campaignId);

    const now = new Date();
    const { rows } = await client.query(
      `UPDATE campaigns
       SET goal         = COALESCE($1, goal),
           audience     = COALESCE($2, audience),
           budget_range = COALESCE($3, budget_range),
           channels     = COALESCE($4::jsonb, channels),
           cadence      = COALESCE($5, cadence),
           status       = 'active',
           next_run_at  = $6,
           updated_at   = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [
        mission.objective ?? null,
        mission.targetAudience ?? null,
        mission.budgetRange ?? null,
        mission.channels ? JSON.stringify(mission.channels) : null,
        mission.cadence ?? null,
        nextRunFor(mission.cadence ?? null, now),
        campaignId,
        userId
      ]
    );
    const campaign = rows[0];

    // ON CONFLICT DO NOTHING against the live-job partial unique index:
    // re-activating an already-running campaign refreshes the mission without
    // stacking a duplicate queue.
    const created = [];
    for (const type of JOB_TYPES) {
      const scheduledFor = new Date(now.getTime() + FIRST_RUN_OFFSET_HOURS[type] * 60 * 60 * 1000);
      const inserted = await client.query(
        `INSERT INTO automation_jobs (user_id, campaign_id, type, status, scheduled_for)
         VALUES ($1, $2, $3, 'pending', $4)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [userId, campaignId, type, scheduledFor]
      );
      if (inserted.rowCount > 0) created.push(inserted.rows[0]);
    }

    await client.query('COMMIT');

    // Mirroring and logging happen strictly after COMMIT, never inside it.
    // Firestore is a mirror; a failure there must not roll back an activation
    // the database has already accepted.
    for (const job of created) await mirrorAutomationJob(job);
    await logAgent(userId, 'automation', 'campaign_activated', 'success',
      { campaignId }, { jobsCreated: created.length });

    return { campaign, jobs: created };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Stop the loop. Pending jobs are cancelled so nothing fires after the user
 * switches automation off. Jobs already `running` are left to finish rather
 * than abandoned mid-flight, and completed history is preserved.
 */
export async function deactivateCampaignAutomation(userId, campaignId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await loadOwnedCampaign(client, userId, campaignId);

    const { rows } = await client.query(
      `UPDATE campaigns SET status = 'paused', next_run_at = NULL, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [campaignId, userId]
    );

    const cancelled = await client.query(
      `UPDATE automation_jobs
       SET status = 'cancelled', updated_at = NOW()
       WHERE campaign_id = $1 AND user_id = $2 AND status = 'pending'
       RETURNING *`,
      [campaignId, userId]
    );

    await client.query('COMMIT');

    for (const job of cancelled.rows) await mirrorAutomationJob(job);
    await logAgent(userId, 'automation', 'campaign_deactivated', 'success',
      { campaignId }, { jobsCancelled: cancelled.rowCount });

    return { campaign: rows[0], cancelledCount: cancelled.rowCount };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Jobs for the signed-in user. `user_id` is always applied — the UI filters are
 * additive to ownership, never a substitute for it.
 */
export async function listAutomationJobs(userId, { status, campaignId, limit = 100 } = {}) {
  const clauses = ['j.user_id = $1'];
  const params = [userId];

  if (status) {
    params.push(status);
    clauses.push(`j.status = $${params.length}`);
  }
  if (campaignId) {
    params.push(campaignId);
    clauses.push(`j.campaign_id = $${params.length}`);
  }
  params.push(Math.min(Number(limit) || 100, 200));

  const { rows } = await pool.query(
    `SELECT j.*, c.name AS campaign_name
     FROM automation_jobs j
     JOIN campaigns c ON c.id = j.campaign_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY j.created_at DESC
     LIMIT $${params.length}`,
    params
  );
  return rows;
}

export async function listCampaigns(userId) {
  const { rows } = await pool.query(
    `SELECT c.*,
            COUNT(j.id) FILTER (WHERE j.status = 'pending')   AS pending_jobs,
            COUNT(j.id) FILTER (WHERE j.status = 'running')   AS running_jobs,
            COUNT(j.id) FILTER (WHERE j.status = 'completed') AS completed_jobs
     FROM campaigns c
     LEFT JOIN automation_jobs j ON j.campaign_id = c.id
     WHERE c.user_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return rows;
}
