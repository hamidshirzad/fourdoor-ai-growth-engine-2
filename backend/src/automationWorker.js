import dotenv from 'dotenv';
import pool from './db/pool.js';
import {
  defaultWorkerId,
  recoverStaleAutomationJobs,
  runAutomationBatch
} from './services/automationWorkerService.js';
import {
  isAutomationWorkerEnabled,
  normalizeBatchSize,
  normalizePollMs,
  normalizeStaleLockMinutes
} from './services/automationWorkerPolicy.js';

dotenv.config();

if (!isAutomationWorkerEnabled()) {
  console.log('Automation worker disabled. Set AUTOMATION_WORKER_ENABLED=true on the dedicated worker service to start it.');
  await pool.end?.().catch(() => {});
  process.exit(0);
}

const workerId = process.env.AUTOMATION_WORKER_ID || defaultWorkerId();
const pollMs = normalizePollMs();
const batchSize = normalizeBatchSize();
const staleMinutes = normalizeStaleLockMinutes();
let running = false;
let stopping = false;
let timer;

async function tick() {
  if (running || stopping) return;
  running = true;
  try {
    const recovered = await recoverStaleAutomationJobs({ staleMinutes });
    if (recovered.length) console.log(`[automation-worker] recovered ${recovered.length} stale job(s)`);

    const results = await runAutomationBatch({ workerId, limit: batchSize });
    if (results.length) {
      const completed = results.filter((result) => result.status === 'completed').length;
      const retriedOrFailed = results.length - completed;
      console.log(`[automation-worker] processed=${results.length} completed=${completed} retry_or_failed=${retriedOrFailed}`);
    }
  } catch (err) {
    console.error('[automation-worker] tick failed:', err);
  } finally {
    running = false;
  }
}

async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`[automation-worker] received ${signal}; shutting down`);
  if (timer) clearInterval(timer);

  const deadline = Date.now() + 30000;
  while (running && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await pool.end?.().catch((err) => console.error('[automation-worker] pool shutdown failed:', err.message));
  process.exit(running ? 1 : 0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log(`[automation-worker] starting id=${workerId} pollMs=${pollMs} batchSize=${batchSize} staleLockMinutes=${staleMinutes}`);
await tick();
timer = setInterval(tick, pollMs);
