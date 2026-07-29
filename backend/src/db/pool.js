import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

let activePool = null;
let isInMemory = false;
let memFallbackPool = null;

const isProduction = process.env.NODE_ENV === 'production';

/**
 * The in-memory pg-mem database is a **local development convenience only**.
 *
 * It used to engage automatically whenever Postgres was unreachable, including
 * in production. That turned a connection problem into silent data loss: the
 * API kept answering, signups and subscription changes were written to a
 * database that lives in RAM, and everything disappeared on the next restart.
 * A missing DATABASE_URL should stop the service, not fake one.
 *
 * Set ALLOW_IN_MEMORY_DB=true to opt in; it is refused under NODE_ENV=production.
 */
function inMemoryAllowed() {
  if (isProduction) return false;
  return process.env.ALLOW_IN_MEMORY_DB === 'true' || process.env.NODE_ENV === 'test';
}

// Imported lazily so production installs never need pg-mem present at all.
async function createInMemoryPool() {
  console.warn('[DB] Using the in-memory pg-mem database. Data will not persist.');
  const { newDb } = await import('pg-mem');
  isInMemory = true;
  const memDb = newDb();

  memDb.public.registerFunction({
    name: 'gen_random_uuid',
    returns: memDb.public.getType('uuid'),
    impure: true,
    implementation: () => crypto.randomUUID()
  });

  const { Pool: MemPool } = memDb.adapters.createPg();
  return new MemPool();
}

function sslConfig() {
  // A connection string carrying its own sslmode= wins over this setting,
  // because pg merges the parsed connection string over the pool config.
  const explicit = process.env.DATABASE_SSL;
  if (explicit === 'true') return { rejectUnauthorized: false };
  if (explicit === 'false') return false;
  return isProduction || process.env.AWS_REGION ? { rejectUnauthorized: false } : false;
}

async function initPool() {
  if (activePool) return activePool;

  if (process.env.DATABASE_URL) {
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig(),
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      min: Number(process.env.DATABASE_POOL_MIN ?? (isProduction ? 5 : 2)),
      connectionTimeoutMillis: Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 10000)
    });

    try {
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      if (client.release) client.release();
      console.log('[DB] Connected to PostgreSQL.');
      activePool = pgPool;
      return activePool;
    } catch (err) {
      await pgPool.end().catch(() => {});
      if (!inMemoryAllowed()) {
        // Fail loudly. A half-working API backed by a phantom database is
        // worse than an honest outage, and /health/ready will report it.
        throw new Error(`Cannot connect to PostgreSQL: ${err.message}`);
      }
      console.warn(`[DB] PostgreSQL connection failed (${err.message}).`);
    }
  } else if (!inMemoryAllowed()) {
    throw new Error('DATABASE_URL is not set. Configure a PostgreSQL connection string.');
  }

  activePool = await createInMemoryPool();
  return activePool;
}

async function withPool(method, args) {
  try {
    const p = await initPool();
    return await p[method](...args);
  } catch (err) {
    if (!isInMemory && inMemoryAllowed()) {
      console.warn(`[DB] ${method} failed (${err.message}). Falling back to pg-mem.`);
      if (!memFallbackPool) memFallbackPool = await createInMemoryPool();
      activePool = memFallbackPool;
      return activePool[method](...args);
    }
    throw err;
  }
}

const poolProxy = {
  query: (...args) => withPool('query', args),
  connect: (...args) => withPool('connect', args),
  on: (...args) => {
    if (activePool && activePool.on) activePool.on(...args);
  },
  end: async () => {
    if (activePool && activePool.end) {
      await activePool.end().catch(() => {});
    }
  }
};

export async function checkDatabaseHealth() {
  try {
    const p = await initPool();
    const client = await p.connect();
    await client.query('SELECT 1 as health_check');
    if (client.release) client.release();
    // An in-memory database is never "healthy" as far as a load balancer is
    // concerned — it means the real database is missing.
    if (isInMemory) {
      return { healthy: false, inMemory: true, error: 'Serving from the in-memory database' };
    }
    return { healthy: true, inMemory: false };
  } catch (err) {
    return { healthy: false, error: err.message };
  }
}

export function isInMemoryDb() {
  return isInMemory;
}

export async function closePool() {
  if (activePool && activePool.end) {
    try {
      await activePool.end();
    } catch {
      // Ignore
    }
  }
}

export default poolProxy;
