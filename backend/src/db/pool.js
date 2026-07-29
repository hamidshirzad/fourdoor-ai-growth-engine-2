import pg from 'pg';
import dotenv from 'dotenv';
import { newDb } from 'pg-mem';
import crypto from 'crypto';

dotenv.config();

const { Pool } = pg;

let activePool = null;
let isInMemory = false;

function createInMemoryPool() {
  console.log('[DB] Initializing in-memory pg-mem database...');
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

async function initPool() {
  if (activePool) return activePool;

  if (process.env.DATABASE_URL) {
    try {
      const pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
        max: 10,
        connectionTimeoutMillis: 2000,
      });

      // Test connection quickly
      const client = await pgPool.connect();
      await client.query('SELECT 1');
      if (client.release) client.release();
      console.log('[DB] Connected to PostgreSQL database.');
      activePool = pgPool;
      return activePool;
    } catch (err) {
      console.warn(`[DB] PostgreSQL connection failed (${err.message}). Falling back to in-memory database.`);
    }
  }

  activePool = createInMemoryPool();
  return activePool;
}

let memFallbackPool = null;

const poolProxy = {
  query: async (...args) => {
    try {
      const p = await initPool();
      return await p.query(...args);
    } catch (err) {
      if (!isInMemory) {
        console.warn(`[DB] Query failed (${err.message}). Switching to pg-mem fallback...`);
        if (!memFallbackPool) memFallbackPool = createInMemoryPool();
        activePool = memFallbackPool;
        return await activePool.query(...args);
      }
      throw err;
    }
  },
  connect: async (...args) => {
    try {
      const p = await initPool();
      return await p.connect(...args);
    } catch (err) {
      if (!isInMemory) {
        console.warn(`[DB] Connect failed (${err.message}). Switching to pg-mem fallback...`);
        if (!memFallbackPool) memFallbackPool = createInMemoryPool();
        activePool = memFallbackPool;
        return await activePool.connect(...args);
      }
      throw err;
    }
  },
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
    return { healthy: true, inMemory: isInMemory };
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
    } catch (err) {
      // Ignore
    }
  }
}

export default poolProxy;
