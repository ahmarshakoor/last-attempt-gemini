import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireActiveStudyAccess } from '../middleware.js';
import { isFirebaseIdToken, setSessionCookie } from '../auth.js';
import { User } from '../../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const studyRouter = Router();

function getStudyFilePath(): string | null {
  const candidates = [
    path.resolve(process.cwd(), 'study', 'index.html'),
    path.resolve(__dirname, '../../../study/index.html'),
    '/app/applet/study/index.html',
    '/study/index.html',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return null;
}

function generateInjectedControls(user: User): string {
  const expiryText = user.access_expires_at
    ? `Active until ${new Date(user.access_expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Lifetime Access';

  const adminButton = user.role === 'admin'
    ? `<a href="/admin/access" style="display:inline-flex;align-items:center;gap:5px;background:#3b82f6;color:#ffffff;text-decoration:none;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        Admin Portal
       </a>`
    : '';

  return `
<!-- LAST ATTEMPT Injected Session Control Bar -->
<div id="la-session-bar" style="position:fixed;top:10px;right:16px;z-index:9999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.18);border-radius:12px;background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;display:flex;align-items:center;padding:6px 12px;gap:12px;backdrop-filter:blur(8px);">
  <div style="display:flex;align-items:center;gap:8px;">
    <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;"></span>
    <div style="line-height:1.2;">
      <div style="font-size:12px;font-weight:700;color:#fafafa;">${user.name.replace(/</g, '&lt;')}</div>
      <div style="font-size:10px;color:#a1a1aa;">${expiryText}</div>
    </div>
  </div>
  <div style="display:flex;align-items:center;gap:6px;">
    <a href="/" style="display:inline-flex;align-items:center;gap:4px;background:#27272a;color:#e4e4e7;text-decoration:none;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;border:1px solid #3f3f46;transition:all 0.15s;" onmouseover="this.style.background='#3f3f46'" onmouseout="this.style.background='#27272a'">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m15 18-6-6 6-6"/></svg>
      Gateway
    </a>
    ${adminButton}
    <button onclick="handleLastAttemptSignOut()" style="background:#dc2626;color:#ffffff;border:none;padding:5px 10px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">
      Sign Out
    </button>
  </div>
  <button id="la-bar-toggle" onclick="toggleLastAttemptBar()" title="Minimize" style="background:transparent;border:none;color:#a1a1aa;cursor:pointer;padding:2px;font-size:12px;line-height:1;margin-left:4px;">
    ✕
  </button>
</div>

<div id="la-bar-minimized" onclick="toggleLastAttemptBar()" style="display:none;position:fixed;top:10px;right:16px;z-index:9999999;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;padding:6px 10px;border-radius:20px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,0.2);align-items:center;gap:6px;">
  <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#22c55e;"></span>
  <span>Access Controls</span>
</div>

<script>
(function() {
  try {
    var params = new URLSearchParams(window.location.search);
    var urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('last_attempt_token', urlToken);
    }
  } catch(e) {}
})();

function handleLastAttemptSignOut() {
  if (confirm('Are you sure you want to sign out?')) {
    try { localStorage.removeItem('last_attempt_token'); } catch(e){}
    fetch('/api/auth/logout', { method: 'POST' })
      .then(function() { window.location.href = '/'; })
      .catch(function() { window.location.href = '/'; });
  }
}

function toggleLastAttemptBar() {
  var bar = document.getElementById('la-session-bar');
  var mini = document.getElementById('la-bar-minimized');
  if (bar.style.display === 'none') {
    bar.style.display = 'flex';
    mini.style.display = 'none';
  } else {
    bar.style.display = 'none';
    mini.style.display = 'flex';
  }
}
</script>
`;
}

function deliverStudy(req: Request, res: Response) {
  const studyFilePath = getStudyFilePath();
  if (!studyFilePath) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head><title>Study Content Not Found</title></head>
        <body style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2>study/index.html is not yet present</h2>
          <p>Please place your <code>study/index.html</code> content file into the <code>study/</code> directory.</p>
          <a href="/">← Return to Gateway</a>
        </body>
      </html>
    `);
    return;
  }

  try {
    const rawHtml = fs.readFileSync(studyFilePath, 'utf-8');

    // Also refresh cookie for this session if token exists
    const sessionId = (req.query?.token as string) || req.cookies?.last_attempt_session;
    if (sessionId && !isFirebaseIdToken(sessionId)) {
      setSessionCookie(res, req, sessionId);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(rawHtml);
  } catch (err) {
    console.error('Error delivering study HTML:', err);
    res.status(500).send('Error delivering protected study content');
  }
}

function deliverStudyAppShell(req: Request, res: Response) {
  const sourceIndex = path.resolve(process.cwd(), 'index.html');
  const builtIndex = path.resolve(process.cwd(), 'dist', 'index.html');
  const candidates = process.env.NODE_ENV === 'production'
    ? [builtIndex, sourceIndex]
    : [sourceIndex, builtIndex];
  const shellPath = candidates.find((candidate) => fs.existsSync(candidate));

  // Fall back to the original study document if the app shell is unavailable.
  if (!shellPath) {
    deliverStudy(req, res);
    return;
  }

  const sessionId = (req.query?.token as string) || req.cookies?.last_attempt_session;
  if (sessionId && !isFirebaseIdToken(sessionId)) {
    setSessionCookie(res, req, sessionId);
  }

  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(shellPath, (err) => {
    if (err) {
      console.error('Error delivering Study app shell:', err);
      if (!res.headersSent) res.status(500).send('Error delivering the protected Study app shell');
    }
  });
}

// All /study routes require active study access
studyRouter.use(requireActiveStudyAccess);

studyRouter.get('/', deliverStudyAppShell);
studyRouter.get('/index.html', deliverStudy);
studyRouter.get('/*', deliverStudy);
