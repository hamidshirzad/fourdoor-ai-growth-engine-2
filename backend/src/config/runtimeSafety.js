export function isPreviewEnvironment(env = process.env) {
  const candidates = [env.VERCEL_ENV, env.APP_ENV, env.ENVIRONMENT]
    .map((value) => String(value || '').toLowerCase());
  return candidates.some((value) => value === 'preview' || value === 'staging');
}

export function shouldStartSchedulers(env = process.env) {
  if (String(env.DISABLE_SCHEDULERS || '').toLowerCase() === 'true') return false;
  if (isPreviewEnvironment(env)) return false;
  return true;
}
