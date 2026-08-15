import os from 'node:os';
import pool from '../db/pool.js';
import { generateDailyContent } from './contentService.js';
import { createOutreachDraft } from './leadService.js';
import { getOptimization } from './analyticsService.js';
import { nextRunFor } from './automationService.js';
import { logAgent } from './logService.js';
import { mirrorAutomationJob } from './firestoreLogService.js';
import {
  normalizeBatchSize,
  normalizeStaleLockMinutes,
  retryDelayMs
} from './automationWorkerPolicy.js';

const SAFE_SOCIAL_CHANNELS = new Set(['linkedin', 'x', 'instagram']);

function resultSummary(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? {});
  return text.length > 4000 ? `${text.slice(0, 3997)}...` : text;
}

async function mirrorSafely(job) {
  if (!job) return;
  try {
    await mirrorAutomationJob(job);
  } catch (err) {
    console.error('Automation worker Firestore mirror failed:', err.message);
  }
}

async function logSafely(...args) {
  try {
    await logAgent(...args);
  } catch (err) {
    console.error('Automation worker audit log failed:', err.message);
  }
}

export function defaultWorkerId() {
  return `${os.hostname()}:${process.pid}`;
}

export async function recoverStaleAutomationJobs({ staleMinutes = normalizeStaleLockMinutes() } = {}) {
  const { rows } = await pool.query(
    `UPDATE automation_jobs
     SET status = CASE WHEN attempt_count >= max_attempts THEN 'failed' ELSE 'pending' END,
         scheduled_for = CASE
           WHEN attempt_count >= max_attempts THEN scheduled_for
           ELSE NOW() + INTERVAL '1 minute'
         END,
         completed_at = CASE WHEN attempt_count >= max_attempts THEN NOW() ELSE completed_at END,
         last_error = COALESCE(last_error, 'Worker lease expired before completion'),
         locked_at = NULL,
         locked_by = NULL,
         updated_at = NOW()
     WHERE status = 'running'
       AND locked_at IS NOT NULL
       AND locked_at < NOW() - ($1::int * INTERVAL '1 minute')
     RETURNING *`,
    [staleMinutes]
  );

  for (const job of rows) await mirrorSafely(job);
  return rows;
}

export async function claimNextAutomationJob({ workerId = defaultWorkerId() } = {}) {
  const { rows } = await pool.query(
    `WITH candidate AS (
       SELECT j.id
       FROM automation_jobs j
       JOIN campaigns c ON c.id = j.campaign_id
       WHERE j.status = 'pending'
         AND j.scheduled_for <= NOW()
         AND j.attempt_count < j.max_attempts
         AND c.status = 'active'
         AND c.next_run_at IS NOT NULL
       ORDER BY j.scheduled_for ASC, j.created_at ASC
       FOR UPDATE OF j SKIP LOCKED
       LIMIT 1
     )
     UPDATE automation_jobs j
     SET status = 'running',
         attempt_count = j.attempt_count + 1,
         locked_at = NOW(),
         locked_by = $1,
         started_at = COALESCE(j.started_at, NOW()),
         last_error = NULL,
         updated_at = NOW()
     FROM candidate
     WHERE j.id = candidate.id
     RETURNING j.*`,
    [workerId]
  );

  const job = rows[0] || null;
  await mirrorSafely(job);
  return job;
}

async function loadExecutionContext(job) {
  const { rows } = await pool.query(
    `SELECT j.id AS job_id,
            j.user_id,
            j.campaign_id,
            j.type,
            j.attempt_count,
            j.max_attempts,
            c.name AS campaign_name,
            c.niche,
            c.audience,
            c.goal,
            c.tone,
            c.cadence,
            c.channels,
            c.status AS campaign_status,
            c.next_run_at,
            u.name,
            u.email,
            u.company,
            u.role,
            u.plan,
            u.subscription_status,
            u.onboarding
     FROM automation_jobs j
     JOIN campaigns c ON c.id = j.campaign_id
     JOIN users u ON u.id = j.user_id
     WHERE j.id = $1 AND j.user_id = $2 AND c.user_id = j.user_id`,
    [job.id, job.user_id]
  );

  const context = rows[0];
  if (!context || context.campaign_status !== 'active' || !context.next_run_at) {
    const error = new Error('Campaign automation is no longer active');
    error.nonRetryable = true;
    throw error;
  }
  return context;
}

async function runContentCreation(context) {
  const requestedChannels = Array.isArray(context.channels) ? context.channels : [];
  const platforms = requestedChannels.filter((channel) => SAFE_SOCIAL_CHANNELS.has(String(channel).toLowerCase()));
  const effectivePlatforms = platforms.length ? platforms : ['linkedin', 'x', 'instagram'];

  const output = await generateDailyContent({
    id: context.user_id,
    name: context.name,
    email: context.email,
    company: context.company,
    role: context.role,
    plan: context.plan,
    subscription_status: context.subscription_status,
    onboarding: context.onboarding
  }, {
    campaignId: context.campaign_id,
    niche: context.niche,
    audience: context.audience,
    goal: context.goal,
    tone: context.tone,
    platforms: effectivePlatforms
  });

  return { postsCreated: output.posts.length, platforms: effectivePlatforms };
}

async function runLeadFollowUp(context) {
  const limit = Math.min(Math.max(Number.parseInt(process.env.AUTOMATION_LEAD_FOLLOW_UP_LIMIT || '5', 10) || 5, 1), 20);
  const { rows } = await pool.query(
    `SELECT l.id
     FROM leads l
     WHERE l.user_id = $1
       AND l.status IN ('new', 'qualified')
       AND NOT EXISTS (
         SELECT 1 FROM outreach o
         WHERE o.user_id = l.user_id
           AND o.lead_id = l.id
           AND o.created_at > NOW() - INTERVAL '7 days'
       )
     ORDER BY l.score DESC, l.created_at ASC
     LIMIT $2`,
    [context.user_id, limit]
  );

  const created = [];
  for (const lead of rows) {
    const draft = await createOutreachDraft(
      context.user_id,
      lead.id,
      `Campaign: ${context.campaign_name}. Objective: ${context.goal}. Create a follow-up draft only; do not send.`
    );
    created.push(draft.id);
  }

  return { outreachDraftsCreated: created.length, outreachIds: created };
}

async function runPerformanceReview(context) {
  const optimization = await getOptimization(context.user_id);
  return { optimization };
}

export async function executeAutomationJob(job) {
  const context = await loadExecutionContext(job);
  switch (job.type) {
    case 'content_creation':
      return runContentCreation(context);
    case 'lead_follow_up':
      return runLeadFollowUp(context);
    case 'performance_review':
      return runPerformanceReview(context);
    default: {
      const error = new Error(`Unsupported automation job type: ${job.type}`);
      error.nonRetryable = true;
      throw error;
    }
  }
}

export async function completeAutomationJob(job, output, { workerId = job.locked_by } = {}) {
  const client = await pool.connect();
  let completed;
  let nextJob = null;
  try {
    await client.query('BEGIN');

    const done = await client.query(
      `UPDATE automation_jobs
       SET status = 'completed',
           result_summary = $1,
           completed_at = NOW(),
           locked_at = NULL,
           locked_by = NULL,
           last_error = NULL,
           updated_at = NOW()
       WHERE id = $2 AND status = 'running' AND locked_by = $3
       RETURNING *`,
      [resultSummary(output), job.id, workerId]
    );
    if (done.rowCount === 0) throw new Error('Automation job lease was lost before completion');
    completed = done.rows[0];

    const campaignResult = await client.query(
      `SELECT id, user_id, cadence, status, next_run_at
       FROM campaigns WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [job.campaign_id, job.user_id]
    );
    const campaign = campaignResult.rows[0];

    if (campaign?.status === 'active' && campaign.next_run_at) {
      const nextScheduledFor = nextRunFor(campaign.cadence, new Date());
      const inserted = await client.query(
        `INSERT INTO automation_jobs (user_id, campaign_id, type, status, scheduled_for)
         VALUES ($1, $2, $3, 'pending', $4)
         ON CONFLICT DO NOTHING
         RETURNING *`,
        [job.user_id, job.campaign_id, job.type, nextScheduledFor]
      );
      nextJob = inserted.rows[0] || null;

      if (job.type === 'content_creation') {
        await client.query(
          `UPDATE campaigns
           SET last_run_at = NOW(), next_run_at = $1, updated_at = NOW()
           WHERE id = $2 AND user_id = $3`,
          [nextScheduledFor, job.campaign_id, job.user_id]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release?.();
  }

  await mirrorSafely(completed);
  await mirrorSafely(nextJob);
  await logSafely(job.user_id, 'automation_worker', job.type, 'success',
    { jobId: job.id, campaignId: job.campaign_id, attempt: job.attempt_count }, output);

  return { completed, nextJob };
}

export async function failAutomationJob(job, error, { workerId = job.locked_by } = {}) {
  const nonRetryable = Boolean(error?.nonRetryable);
  const canRetry = !nonRetryable && Number(job.attempt_count) < Number(job.max_attempts);
  const nextAttemptAt = canRetry ? new Date(Date.now() + retryDelayMs(job.attempt_count)) : null;

  const { rows } = await pool.query(
    `UPDATE automation_jobs
     SET status = $1,
         scheduled_for = COALESCE($2, scheduled_for),
         completed_at = CASE WHEN $1 = 'failed' THEN NOW() ELSE NULL END,
         locked_at = NULL,
         locked_by = NULL,
         last_error = $3,
         updated_at = NOW()
     WHERE id = $4 AND status = 'running' AND locked_by = $5
     RETURNING *`,
    [canRetry ? 'pending' : 'failed', nextAttemptAt, String(error?.message || error || 'Unknown automation error').slice(0, 4000), job.id, workerId]
  );

  const updated = rows[0] || null;
  await mirrorSafely(updated);
  await logSafely(job.user_id, 'automation_worker', job.type, canRetry ? 'retry_scheduled' : 'failed',
    { jobId: job.id, campaignId: job.campaign_id, attempt: job.attempt_count },
    { error: error?.message || String(error), nextAttemptAt });

  return updated;
}

export async function processAutomationJob(job, { workerId = job.locked_by } = {}) {
  try {
    const output = await executeAutomationJob(job);
    await completeAutomationJob(job, output, { workerId });
    return { jobId: job.id, status: 'completed' };
  } catch (err) {
    await failAutomationJob(job, err, { workerId });
    return { jobId: job.id, status: 'failed_or_retrying', error: err.message };
  }
}

export async function runAutomationBatch({ workerId = defaultWorkerId(), limit = normalizeBatchSize() } = {}) {
  const results = [];
  for (let index = 0; index < limit; index += 1) {
    const job = await claimNextAutomationJob({ workerId });
    if (!job) break;
    results.push(await processAutomationJob(job, { workerId }));
  }
  return results;
}
