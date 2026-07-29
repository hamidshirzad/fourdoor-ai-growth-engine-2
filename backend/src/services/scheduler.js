import cron from 'node-cron';
import pool from '../db/pool.js';
import { generateDailyContent, publishDuePosts } from './contentService.js';
import { getOptimization } from './analyticsService.js';
import { logAgent } from './logService.js';

async function logFailureSafely(...args) {
  try {
    await logAgent(...args);
  } catch (err) {
    console.error('Failed to write agent_logs entry for a batch failure:', err.message);
  }
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

export function startSchedulers() {
  if ((process.env.DISABLE_SCHEDULERS || '').toLowerCase() === 'true') {
    console.log('Schedulers disabled via DISABLE_SCHEDULERS');
    return false;
  }

  cron.schedule(process.env.CONTENT_CRON || '0 9 * * *', async () => {
    try {
      const campaigns = await pool.query(
        `SELECT c.*, u.id AS user_id, u.name, u.email, u.company, u.role, u.plan, u.subscription_status, u.onboarding
         FROM campaigns c
         JOIN users u ON u.id = c.user_id
         WHERE c.status = 'active'`
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

  console.log('Schedulers initialized');
  return true;
}
