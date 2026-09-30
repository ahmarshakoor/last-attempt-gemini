// Production & AI Studio Cloud Run Server Entrypoint
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bundledServer = path.join(__dirname, 'dist', 'server.js');

if (fs.existsSync(bundledServer)) {
  await import('./dist/server.js');
} else {
  // If not yet bundled, dynamically run server.ts using tsx
  const { spawn } = await import('child_process');
  const child = spawn('npx', ['tsx', 'server.ts'], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
