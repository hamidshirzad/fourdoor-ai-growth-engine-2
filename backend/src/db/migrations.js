import pool from './pool.js';

const migrations = [
  'CREATE EXTENSION IF NOT EXISTS pgcrypto;',
  `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      role VARCHAR(30) NOT NULL DEFAULT 'user',
      plan VARCHAR(30) NOT NULL DEFAULT 'starter',
      subscription_status VARCHAR(30) NOT NULL DEFAULT 'inactive',
      paypal_subscription_id VARCHAR(255),
      password_reset_token_hash VARCHAR(255),
      password_reset_expires_at TIMESTAMPTZ,
      onboarding JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS campaigns (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      niche VARCHAR(255) NOT NULL,
      audience TEXT NOT NULL,
      goal TEXT NOT NULL,
      tone VARCHAR(100) DEFAULT 'clear, direct, helpful',
      cadence VARCHAR(30) NOT NULL DEFAULT 'daily',
      status VARCHAR(30) NOT NULL DEFAULT 'active',
      strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      platform VARCHAR(30) NOT NULL,
      content_type VARCHAR(40) NOT NULL DEFAULT 'post',
      hook TEXT,
      content TEXT NOT NULL,
      caption TEXT NOT NULL,
      hashtags JSONB NOT NULL DEFAULT '[]'::jsonb,
      cta TEXT,
      media_url TEXT,
      variants JSONB NOT NULL DEFAULT '[]'::jsonb,
      predicted_score INT NOT NULL DEFAULT 50,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      scheduled_at TIMESTAMPTZ,
      posted_at TIMESTAMPTZ,
      external_post_id VARCHAR(255),
      error TEXT,
      metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS leads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255),
      email VARCHAR(255),
      company VARCHAR(255),
      source VARCHAR(80) NOT NULL DEFAULT 'manual',
      message TEXT,
      score INT NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
      intent VARCHAR(30) NOT NULL DEFAULT 'casual',
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      qualification JSONB NOT NULL DEFAULT '{}'::jsonb,
      booking_link TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
      platform VARCHAR(30) NOT NULL DEFAULT 'manual',
      direction VARCHAR(20) NOT NULL,
      sender VARCHAR(60) NOT NULL,
      content TEXT NOT NULL,
      intent VARCHAR(30),
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
      platform VARCHAR(30),
      impressions INT NOT NULL DEFAULT 0,
      clicks INT NOT NULL DEFAULT 0,
      comments INT NOT NULL DEFAULT 0,
      shares INT NOT NULL DEFAULT 0,
      likes INT NOT NULL DEFAULT 0,
      leads INT NOT NULL DEFAULT 0,
      bookings INT NOT NULL DEFAULT 0,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
      calendly_event_uri TEXT,
      calendly_invitee_uri TEXT,
      booking_url TEXT,
      booked_at TIMESTAMPTZ,
      status VARCHAR(30) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS social_accounts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      platform VARCHAR(30) NOT NULL,
      account_name VARCHAR(255),
      account_id VARCHAR(255),
      access_token TEXT,
      refresh_token TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, platform)
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS outreach (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
      channel VARCHAR(30) NOT NULL DEFAULT 'email',
      subject TEXT,
      body TEXT NOT NULL,
      status VARCHAR(30) NOT NULL DEFAULT 'draft',
      sent_at TIMESTAMPTZ,
      replied_at TIMESTAMPTZ,
      booked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS agent_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      agent VARCHAR(60) NOT NULL,
      action VARCHAR(120) NOT NULL,
      status VARCHAR(30) NOT NULL,
      input JSONB NOT NULL DEFAULT '{}'::jsonb,
      output JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS security_scans (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
      post_id UUID REFERENCES posts(id) ON DELETE SET NULL,
      scanned_content TEXT NOT NULL,
      scan_type VARCHAR(30) NOT NULL CHECK (scan_type IN ('content', 'code', 'dependency')),
      vulnerabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
      severity_count JSONB NOT NULL DEFAULT '{"critical": 0, "high": 0, "medium": 0, "low": 0}'::jsonb,
      secrets_found INT NOT NULL DEFAULT 0,
      passed BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  'CREATE INDEX IF NOT EXISTS idx_posts_user_status_schedule ON posts(user_id, status, scheduled_at);',
  'CREATE INDEX IF NOT EXISTS idx_leads_user_score ON leads(user_id, score DESC, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_messages_lead_created ON messages(lead_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_agent_logs_user_created ON agent_logs(user_id, created_at DESC);',
  'CREATE INDEX IF NOT EXISTS idx_security_scans_user_created ON security_scans(user_id, created_at DESC);',
  // Backs the SECURITY_SCAN_CRON anti-join that finds posts with no scan yet.
  'CREATE INDEX IF NOT EXISTS idx_security_scans_post ON security_scans(post_id);',
  // --- Campaign automation ------------------------------------------------
  //
  // Only four new columns. The spec's `objective` and `targetAudience` are the
  // existing `goal` and `audience`; `cadence` and `status` already exist, and
  // `status = 'active'` is already what the CONTENT_CRON job filters on in
  // scheduler.js — so activating automation and activating a campaign are one
  // switch rather than two that can disagree.
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS budget_range VARCHAR(60);`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS channels JSONB NOT NULL DEFAULT '[]'::jsonb;`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;`,
  `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS next_run_at TIMESTAMPTZ;`,

  // Job queue lives in Postgres, not Firestore: it holds primary operational
  // state and needs a real foreign key, so deleting a campaign cannot orphan
  // its jobs. Firestore receives a mirror for live UI, the same direction as
  // agent logs, which keeps the loop running when Firestore is unavailable.
  `
    CREATE TABLE IF NOT EXISTS automation_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      type VARCHAR(40) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      result_summary TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  // Two read paths: "my jobs, newest first" for the UI, "what is due" for the
  // runner. One index each.
  'CREATE INDEX IF NOT EXISTS idx_automation_jobs_user_created ON automation_jobs(user_id, created_at DESC);',
  `CREATE INDEX IF NOT EXISTS idx_automation_jobs_due ON automation_jobs(status, scheduled_for) WHERE status = 'pending';`,
  // One live job per type per campaign. Re-activating a campaign that is already
  // running must not stack a second identical queue; a partial unique index
  // makes that a database guarantee rather than a convention service code can
  // forget.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_jobs_live_unique
     ON automation_jobs(campaign_id, type) WHERE status IN ('pending', 'running');`,

  // WorkOS AuthKit SSO: SSO-only users have no local password.
  'ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS workos_id VARCHAR(255) UNIQUE;',
  // Stripe subscriptions. The customer id is reused across checkouts so a
  // returning user keeps one customer record instead of accumulating duplicates.
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);',
  'CREATE INDEX IF NOT EXISTS idx_users_stripe_customer ON users(stripe_customer_id);',
  'CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription ON users(stripe_subscription_id);',
  // Webhook idempotency: Stripe retries deliveries, and a replayed event must
  // not re-apply a plan change. The primary key makes reprocessing a no-op.
  `
    CREATE TABLE IF NOT EXISTS processed_webhook_events (
      id VARCHAR(255) PRIMARY KEY,
      provider VARCHAR(30) NOT NULL,
      event_type VARCHAR(120),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  `
    CREATE TABLE IF NOT EXISTS outreach_templates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'follow_up',
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      variables JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `,
  'CREATE INDEX IF NOT EXISTS idx_outreach_templates_user_created ON outreach_templates(user_id, created_at DESC);',

  // Backfill next_run_at for campaigns the scheduler is already processing.
  //
  // `status` alone used to mean "automation running", but campaigns.status
  // DEFAULTs to 'active', so every campaign ever created reads as running. The
  // mission panel therefore tests `status = 'active' AND next_run_at IS NOT
  // NULL`, and the CONTENT_CRON query now does the same — otherwise a campaign
  // that was never activated shows "Paused" with no Pause button while the
  // scheduler keeps generating content for it, with no way to stop it.
  //
  // Adding the gate without this backfill would silently stop content
  // generation for every campaign predating the feature. This only ever *adds*
  // a next_run_at to rows the scheduler already selects, so no campaign starts
  // or stops generating as a result. Cadences match CADENCE_HOURS in
  // automationService.js; anything unrecognised takes the same daily fallback
  // as nextRunFor().
  `
    UPDATE campaigns
    SET next_run_at = NOW() + CASE LOWER(COALESCE(cadence, ''))
                                WHEN 'hourly' THEN INTERVAL '1 hour'
                                WHEN 'weekly' THEN INTERVAL '7 days'
                                ELSE INTERVAL '1 day'
                              END
    WHERE status = 'active' AND next_run_at IS NULL;
  `
];

export async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const migration of migrations) {
      try {
        await client.query(migration);
      } catch (migErr) {
        if (migErr.message?.includes('extension') || migErr.message?.includes('pgcrypto')) {
          console.log('[DB] Skipping pgcrypto extension in migration:', migErr.message);
        } else {
          throw migErr;
        }
      }
    }
    await client.query('COMMIT');
    console.log('All migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Migration error:', err.message);
    // Rethrow. This used to log and return normally, so `npm run migrate` exited
    // 0 on a failed statement and Render's `npm run migrate && npm start` went
    // on to boot the API against a rolled-back, incomplete schema. Nothing
    // caught it afterwards either: /health/ready only proves the database is
    // reachable, not that it has the expected tables, so the service reported
    // healthy while routes failed on missing columns.
    throw err;
  } finally {
    if (client.release) client.release();
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // Exit explicitly rather than relying on unhandled-rejection semantics for the
  // exit code — `npm run migrate && npm start` depends on it, and a deploy that
  // starts on a half-migrated schema is worse than one that refuses to start.
  runMigrations()
    .then(() => pool.end?.())
    .catch(async (err) => {
      console.error('Migrations failed, refusing to continue:', err.message);
      await pool.end?.().catch(() => {});
      process.exit(1);
    });
}

