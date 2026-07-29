import pool from '../db/pool.js';
import { analyticsAgent } from './aiService.js';
import { logAgent } from './logService.js';

export async function getAnalytics(userId) {
  const [summary, topPosts, leadsBySource] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(DISTINCT p.id)::int AS total_posts,
         COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'posted')::int AS posted_posts,
         COUNT(DISTINCT l.id)::int AS total_leads,
         COUNT(DISTINCT l.id) FILTER (WHERE l.status IN ('qualified','booked','closed'))::int AS qualified_leads,
         COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'booked')::int AS booked_calls,
         COALESCE(SUM(a.impressions),0)::int AS impressions,
         COALESCE(SUM(a.clicks),0)::int AS clicks,
         COALESCE(SUM(a.comments + a.shares + a.likes),0)::int AS engagements
       FROM users u
       LEFT JOIN posts p ON p.user_id = u.id
       LEFT JOIN leads l ON l.user_id = u.id
       LEFT JOIN bookings b ON b.user_id = u.id
       LEFT JOIN analytics a ON a.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT id, platform, hook, caption, predicted_score, metrics, created_at
       FROM posts
       WHERE user_id = $1
       ORDER BY predicted_score DESC, created_at DESC
       LIMIT 8`,
      [userId]
    ),
    pool.query(
      `SELECT source, COUNT(*)::int AS leads, AVG(score)::numeric(5,2) AS average_score
       FROM leads
       WHERE user_id = $1
       GROUP BY source
       ORDER BY leads DESC`,
      [userId]
    )
  ]);

  const totals = summary.rows[0];
  const engagementRate = totals.impressions > 0 ? (totals.engagements / totals.impressions) * 100 : 0;
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
  const conversionRate = totals.total_leads > 0 ? (totals.booked_calls / totals.total_leads) * 100 : 0;

  return {
    totals: {
      ...totals,
      engagement_rate: Number(engagementRate.toFixed(2)),
      ctr: Number(ctr.toFixed(2)),
      conversion_rate: Number(conversionRate.toFixed(2))
    },
    topPosts: topPosts.rows,
    leadsBySource: leadsBySource.rows
  };
}

export async function getOptimization(userId) {
  const analytics = await getAnalytics(userId);
  const output = await analyticsAgent({
    metrics: analytics.totals,
    recentPosts: analytics.topPosts
  });
  await logAgent(userId, 'analytics_agent', 'optimize_strategy', 'success', analytics, output);
  return { analytics, optimization: output };
}
