import cron from 'node-cron';
import pool from '../db/pool.js';
import { generateDailyContent, publishDuePosts } from './contentService.js';
import { getOptimization } from './analyticsService.js';
import { scanContent, isSecurityScanningEnabled } from './aikidoService.js';
import { logAgent } from './logService.js';

async function logFailureSafely(...args) {
  try {
    await logAgent(...args);
  } catch (err) {
    console.error('Failed to write agent_logs entry for a batch failure:', err.message);
  }
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function runDailyContentGenerationOnce(campaignsRows, { generate = generateDailyContent, log = logFailureSafely } = {}) {
  for (const row of campaignsRows) {
    try {
      await generate({
        id: row.user_id,
        name: row.name,
        email: row.email,
        company: row.company,
        role: row.role,
        plan: row.plan,
        subscription_status: row.subscription_status,
        onboarding: row.onboarding
      }, {
        campaignId: row.id,
        niche: row.niche,
        audience: row.audience,
        goal: row.goal,
        tone: row.tone,
        platforms: ['linkedin', 'x', 'instagram']
      });
    } catch (err) {
      console.error(`Content generation failed for campaign ${row.id} (user ${row.user_id}):`, err.message);
      await log(row.user_id, 'scheduler', 'daily_content_generation', 'failed', { campaignId: row.id }, { error: err.message });
    }
  }
}

export async function runDailyOptimizationOnce(userRows, { optimize = getOptimization, log = logFailureSafely } = {}) {
  for (const user of userRows) {
    try {
      await optimize(user.id);
    } catch (err) {
      console.error(`Optimization failed for user ${user.id}:`, err.message);
      await log(user.id, 'scheduler', 'daily_optimization', 'failed', {}, { error: err.message });
    }
  }
}

export async function runSecurityAuditOnce(postRows, { scan = scanContent, log = logFailureSafely } = {}) {
  let scanned = 0;
  let failed = 0;

  for (const post of postRows) {
    try {
      await scan(post.user_id, post.caption, 'content', post.id, post.campaign_id);
      scanned += 1;
    } catch (err) {
      failed += 1;
      console.error(`Security scan failed for post ${post.id} (user ${post.user_id}):`, err.message);
      await log(post.user_id, 'scheduler', 'security_audit', 'failed', { postId: post.id }, { error: err.message });
    }
  }

  return { scanned, failed };
}

export function startSchedulers() {
  if ((process.env.DISABLE_SCHEDULERS || '').toLowerCase() === 'true') {
    console.log('Schedulers disabled via DISABLE_SCHEDULERS');
    return false;
  }

  cron.schedule(process.env.CONTENT_CRON || '0 9 * * *', async () => {
    try {
      // `status = 'active'` is not sufficient on its own: campaigns.status
      // DEFAULTs to 'active', so a campaign nobody ever activated matches it.
      // next_run_at is set only by activateCampaignAutomation and nulled by the
      // deactivate path, so the pair distinguishes a started campaign from one
      // that merely inherited the default — and it is the same test
      // CampaignMissionPanel uses to decide whether to show the Pause button.
      // Without it the panel could label a campaign paused while this job kept
      // generating content for it, with no way to stop it from the UI.
      const campaigns = await pool.query(
        `SELECT c.*, u.id AS user_id, u.name, u.email, u.company, u.role, u.plan, u.subscription_status, u.onboarding
         FROM campaigns c
         JOIN users u ON u.id = c.user_id
         WHERE c.status = 'active' AND c.next_run_at IS NOT NULL`
      );

      await runDailyContentGenerationOnce(campaigns.rows);
    } catch (err) {
      console.error('Scheduled content generation failed:', err);
      await logFailureSafely(null, 'scheduler', 'daily_content_generation', 'failed', {}, { error: err.message });
    }
  });

  cron.schedule(process.env.PUBLISH_CRON || '*/5 * * * *', async () => {
    try {
      await publishDuePosts();
    } catch (err) {
      console.error('Scheduled publishing failed:', err);
      await logFailureSafely(null, 'scheduler', 'publish_due_posts', 'failed', {}, { error: err.message });
    }
  });

  cron.schedule(process.env.OPTIMIZATION_CRON || '0 18 * * *', async () => {
    try {
      const users = await pool.query('SELECT id FROM users');
      await runDailyOptimizationOnce(users.rows);
    } catch (err) {
      console.error('Scheduled optimization failed:', err);
      await logFailureSafely(null, 'scheduler', 'daily_optimization', 'failed', {}, { error: err.message });
    }
  });

  // Periodic audit of post copy that never got scanned at generation time —
  // posts created before AIKIDO_API_KEY was configured, or whose inline scan in
  // generateDailyContent hit an API error. Skipped entirely when scanning is
  // unconfigured, so the query does not run every night for nothing.
  if (isSecurityScanningEnabled()) {
    cron.schedule(process.env.SECURITY_SCAN_CRON || '0 3 * * *', async () => {
      try {
        const lookbackDays = positiveInt(process.env.SECURITY_SCAN_LOOKBACK_DAYS, 7);
        const batchSize = positiveInt(process.env.SECURITY_SCAN_BATCH_SIZE, 100);

        const posts = await pool.query(
          `SELECT p.id, p.user_id, p.campaign_id, p.caption
           FROM posts p
           LEFT JOIN security_scans s ON s.post_id = p.id
           WHERE s.id IS NULL
             AND p.caption IS NOT NULL
             AND p.caption <> ''
             AND p.created_at > NOW() - ($1::int * INTERVAL '1 day')
           ORDER BY p.created_at DESC
           LIMIT $2`,
          [lookbackDays, batchSize]
        );

        const { scanned, failed } = await runSecurityAuditOnce(posts.rows);
        if (scanned || failed) {
          console.log(`Scheduled security audit: ${scanned} post(s) scanned, ${failed} failed`);
        }
      } catch (err) {
        console.error('Scheduled security audit failed:', err);
        await logFailureSafely(null, 'scheduler', 'security_audit', 'failed', {}, { error: err.message });
      }
    });
  } else {
    console.log('Scheduled security audit disabled (AIKIDO_API_KEY not configured)');
  }

  console.log('Schedulers initialized');
  return true;
}
