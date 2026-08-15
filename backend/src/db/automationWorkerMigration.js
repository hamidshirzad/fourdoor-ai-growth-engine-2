import pool from './pool.js';

const statements = [
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0;`,
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 3;`,
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;`,
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS locked_by VARCHAR(255);`,
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;`,
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;`,
  `ALTER TABLE automation_jobs ADD COLUMN IF NOT EXISTS last_error TEXT;`,
  `CREATE INDEX IF NOT EXISTS idx_automation_jobs_claim
     ON automation_jobs(status, scheduled_for, attempt_count)
     WHERE status = 'pending';`,
  `CREATE INDEX IF NOT EXISTS idx_automation_jobs_stale_running
     ON automation_jobs(locked_at)
     WHERE status = 'running';`
];

export async function runAutomationWorkerMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const statement of statements) await client.query(statement);
    await client.query('COMMIT');
    console.log('Automation worker migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Automation worker migration failed:', err.message);
    throw err;
  } finally {
    client.release?.();
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname) {
  runAutomationWorkerMigration()
    .then(() => pool.end?.())
    .catch(async (err) => {
      console.error('Worker schema migration failed, refusing to continue:', err.message);
      await pool.end?.().catch(() => {});
      process.exit(1);
    });
}
