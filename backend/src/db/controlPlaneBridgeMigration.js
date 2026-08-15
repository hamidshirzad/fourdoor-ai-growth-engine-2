import pool from './pool.js';

export async function runControlPlaneBridgeMigration() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS external_identities (
      provider VARCHAR(40) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      verified_email VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (provider, subject),
      UNIQUE (user_id, provider)
    );`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_source VARCHAR(40);`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_external_identity
       ON campaigns(user_id, external_source, external_id);`,
    `CREATE TABLE IF NOT EXISTS internal_request_nonces (
      nonce VARCHAR(128) PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_internal_request_nonces_created
       ON internal_request_nonces(created_at);`
  ];

  for (const statement of statements) await pool.query(statement);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runControlPlaneBridgeMigration()
    .then(() => {
      console.log('Control-plane bridge migration complete');
      return pool.end();
    })
    .catch((error) => {
      console.error('Control-plane bridge migration failed:', error);
      process.exitCode = 1;
    });
}
