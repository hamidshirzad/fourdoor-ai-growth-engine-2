import fs from 'node:fs';

const failures = [];
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const backendEntry = read('backend/src/index.js');
const runtimeSafety = read('backend/src/config/runtimeSafety.js');
const app = read('backend/src/app.js');
const envExample = read('.env.example');

if (!backendEntry.includes('shouldStartSchedulers')) {
  failures.push('Backend entrypoint must use the runtime scheduler safety policy.');
}

if (!runtimeSafety.includes('DISABLE_SCHEDULERS') || !runtimeSafety.includes('VERCEL_ENV')) {
  failures.push('Runtime safety policy must honor the scheduler kill switch and preview environment.');
}

for (const route of ['/health', '/health/live', '/health/ready']) {
  if (!app.includes(`'${route}'`) && !app.includes(`\"${route}\"`)) {
    failures.push(`Missing health endpoint: ${route}`);
  }
}

for (const key of ['DATABASE_URL=', 'JWT_SECRET=', 'CORS_ORIGIN=', 'DISABLE_SCHEDULERS=']) {
  if (!envExample.includes(key)) failures.push(`.env.example is missing ${key}`);
}

if (!app.includes("express.raw({ type: 'application/json' })")) {
  failures.push('Stripe webhook must preserve raw request bytes for signature verification.');
}

if (failures.length) {
  console.error('Production safety contract failed:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Production safety contract passed.');
