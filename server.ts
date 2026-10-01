import express from 'express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './src/db/index.js';
import { authRouter } from './src/server/routes/auth.js';
import { gatewayRouter } from './src/server/routes/gateway.js';
import { notificationsRouter } from './src/server/routes/notifications.js';
import { adminRouter } from './src/server/routes/admin.js';
import { studyRouter } from './src/server/routes/study.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Enable trust proxy for cloud run / reverse proxy environments
  app.set('trust proxy', 1);

  // Initialize DB
  await getDb();

  // Basic middleware
  app.use(
    compression({
      filter: (req: express.Request, res: express.Response) => {
        if (req.path && req.path.startsWith('/study')) return false;
        return compression.filter(req, res);
      },
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Mount API routes
  app.use('/api/auth', authRouter);
  app.use('/api/gateway', gatewayRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/admin', adminRouter);

  // Protected Study Route (CRITICAL: Must be registered before Vite/static middlewares)
  app.use('/study', studyRouter);

  // Vite development middleware or static production serving
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: Number(PORT) },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production & Shared App URL: Serve pre-built static bundle
    const rootDir = process.cwd();
    const distPath = fs.existsSync(path.join(rootDir, 'dist', 'index.html'))
      ? path.join(rootDir, 'dist')
      : path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[LAST ATTEMPT] Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[LAST ATTEMPT] Fatal server startup error:', err);
  process.exit(1);
});
