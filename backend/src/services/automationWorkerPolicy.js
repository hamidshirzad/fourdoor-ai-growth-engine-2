export function isAutomationWorkerEnabled(value = process.env.AUTOMATION_WORKER_ENABLED) {
  return String(value || '').toLowerCase() === 'true';
}

export function retryDelayMs(attemptCount) {
  const attempt = Math.max(1, Number(attemptCount) || 1);
  const minutes = Math.min(60, 5 ** (attempt - 1));
  return minutes * 60 * 1000;
}

export function normalizeBatchSize(value = process.env.AUTOMATION_WORKER_BATCH_SIZE) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) return 5;
  return Math.min(parsed, 20);
}

export function normalizePollMs(value = process.env.AUTOMATION_WORKER_POLL_MS) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 5000) return 30000;
  return Math.min(parsed, 5 * 60 * 1000);
}

export function normalizeStaleLockMinutes(value = process.env.AUTOMATION_WORKER_STALE_LOCK_MINUTES) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 5) return 30;
  return Math.min(parsed, 24 * 60);
}
