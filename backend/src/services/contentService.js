import pool from '../db/pool.js';
import { contentAgent } from './aiService.js';
import { publishPost } from './distributionService.js';
import { logAgent } from './logService.js';
import { scanContent } from './aikidoService.js';

const PLAN_LIMITS = {
  starter: { monthlyPosts: 30, accounts: 2 },
  pro: { monthlyPosts: 180, accounts: 6 },
  agency: { monthlyPosts: 1000, accounts: 25 }
};

export function getPlanLimits(plan = 'starter') {
  return PLAN_LIMITS[plan] || PLAN_LIMITS.starter;
}

async function assertPostAllowance(userId, plan, requestedCount) {
  const limit = getPlanLimits(plan).monthlyPosts;
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count FROM posts
     WHERE user_id = $1 AND created_at >= date_trunc('month', NOW())`,
    [userId]
  );
  if (result.rows[0].count + requestedCount > limit) {
    throw new Error(`Plan limit exceeded: ${limit} posts per month`);
  }
}

export async function upsertCampaign(userId, payload) {
  const result = await pool.query(
    `INSERT INTO campaigns (user_id, name, niche, audience, goal, tone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, payload.name || `${payload.niche} growth campaign`, payload.niche, payload.audience, payload.goal, payload.tone || null]
  );
  return result.rows[0];
}

export async function generateDailyContent(user, payload) {
  const platforms = payload.platforms?.length ? payload.platforms : ['linkedin', 'x', 'instagram'];
  await assertPostAllowance(user.id, user.plan, platforms.length);

  const campaign = payload.campaignId
    ? (await pool.query('SELECT * FROM campaigns WHERE id = $1 AND user_id = $2', [payload.campaignId, user.id])).rows[0]
    : await upsertCampaign(user.id, payload);

  if (!campaign) throw new Error('Campaign not found');

  const posts = [];
  for (const platform of platforms) {
    const output = await contentAgent({
      niche: campaign.niche,
      audience: campaign.audience,
      goal: campaign.goal,
      tone: campaign.tone,
      platform
    });

    const result = await pool.query(
      `INSERT INTO posts (
        user_id, campaign_id, platform, content_type, hook, content, caption,
        hashtags, cta, variants, predicted_score, status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft')
      RETURNING *`,
      [
        user.id,
        campaign.id,
        platform,
        output.contentType,
        output.hook,
        output.script,
        output.caption,
        JSON.stringify(output.hashtags),
        output.cta,
        JSON.stringify(output.variants),
        Math.max(0, Math.min(100, output.predictedScore))
      ]
    );
    const post = result.rows[0];
    posts.push(post);

    await scanContent(user.id, output.caption, 'content', post.id, campaign.id);
    await logAgent(user.id, 'content_agent', 'generate_post', 'success', { platform, campaignId: campaign.id }, output);
  }

  return { campaign, posts };
}

export async function getUserPosts(userId, limit = 100) {
  const result = await pool.query(
    `SELECT p.*, c.name AS campaign_name
     FROM posts p
     LEFT JOIN campaigns c ON c.id = p.campaign_id
     WHERE p.user_id = $1
     ORDER BY COALESCE(p.scheduled_at, p.created_at) DESC
     LIMIT $2`,
    [userId, Number(limit)]
  );
  return result.rows;
}

export async function schedulePost(user, { postId, scheduledAt, platform, variantIndex = 0 }) {
  const result = await pool.query(
    `UPDATE posts
     SET scheduled_at = $1, platform = COALESCE($2, platform), status = 'scheduled', updated_at = NOW(),
         caption = COALESCE((variants->($5)::int->>'caption'), caption)
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
    [scheduledAt, platform || null, postId, user.id, variantIndex]
  );
  if (result.rowCount === 0) throw new Error('Post not found');
  return result.rows[0];
}

export async function publishDuePosts() {
  const result = await pool.query(
    `SELECT p.*, u.plan, u.subscription_status
     FROM posts p
     JOIN users u ON u.id = p.user_id
     WHERE p.status = 'scheduled' AND p.scheduled_at <= NOW()
     ORDER BY p.scheduled_at ASC
     LIMIT 25`
  );

  const published = [];
  for (const post of result.rows) {
    try {
      const output = await publishPost(post);
      const update = await pool.query(
        `UPDATE posts
         SET status = 'posted', posted_at = NOW(), external_post_id = $1, error = NULL, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
        [output.externalPostId, post.id]
      );
      published.push(update.rows[0]);
      await logAgent(post.user_id, 'distribution_engine', 'publish_post', 'success', { postId: post.id }, output);
    } catch (err) {
      await pool.query(
        `UPDATE posts SET status = 'failed', error = $1, updated_at = NOW() WHERE id = $2`,
        [err.message, post.id]
      );
      await logAgent(post.user_id, 'distribution_engine', 'publish_post', 'failed', { postId: post.id }, { error: err.message });
    }
  }
  return published;
}

export async function recordPostMetrics(userId, postId, metrics) {
  const safe = {
    impressions: Number(metrics.impressions || 0),
    clicks: Number(metrics.clicks || 0),
    comments: Number(metrics.comments || 0),
    shares: Number(metrics.shares || 0),
    likes: Number(metrics.likes || 0),
    leads: Number(metrics.leads || 0),
    bookings: Number(metrics.bookings || 0)
  };
  const post = await pool.query('SELECT platform FROM posts WHERE id = $1 AND user_id = $2', [postId, userId]);
  if (post.rowCount === 0) throw new Error('Post not found');
  await pool.query(
    `INSERT INTO analytics (user_id, post_id, platform, impressions, clicks, comments, shares, likes, leads, bookings)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [userId, postId, post.rows[0].platform, safe.impressions, safe.clicks, safe.comments, safe.shares, safe.likes, safe.leads, safe.bookings]
  );
  await pool.query('UPDATE posts SET metrics = metrics || $1::jsonb, updated_at = NOW() WHERE id = $2', [JSON.stringify(safe), postId]);
  return safe;
}
