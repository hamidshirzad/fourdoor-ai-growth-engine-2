import express from 'express';
import next from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

import backendApp from './backend/src/app.js';
import { runMigrations } from './backend/src/db/migrations.js';
import { seedData } from './backend/src/db/seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const dev = process.env.NODE_ENV !== 'production';

async function startServer() {
  try {
    await runMigrations();
    await seedData();
  } catch (err) {
    console.warn('[Server] DB init notice:', err.message);
  }

  const nextApp = next({ dev, dir: path.resolve(__dirname, 'frontend') });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  const server = express();

  // Route backend API requests first
  server.use(backendApp);

  // Delegate all remaining routes to Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Studio] Server ready on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[AI Studio] Server startup error:', err);
  process.exit(1);
});
