import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { requireActiveStudyAccess } from '../middleware.js';
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

let cachedStudy: { head: string; tail: string; headGz?: Buffer; tailGz?: Buffer } | null = null;

function removeScriptContaining(html: string, marker: string): string {
  const m = html.indexOf(marker);
  if (m < 0) return html;
  const start = html.lastIndexOf('<script', m);
  const end = html.indexOf('</script>', m);
  if (start < 0 || end < 0) return html;
  return html.slice(0, start) + html.slice(end + 9);
}

function loadStudy() {
  if (cachedStudy) return cachedStudy;
  const p = getStudyFilePath();
  if (!p) return null;
  let html = fs.readFileSync(p, 'utf-8');
  // Remove old client-side session card + its script if present in study HTML.
  html = html.replace(/<la-session-card[^>]*><\/la-session-card>/g, '');
  html = removeScriptContaining(html, '<la-session-card> : Last Attempt subscription');
  html = removeScriptContaining(html, 'firebasejs/10.8.0/firebase-app.js');
  const i = html.lastIndexOf('</body>');
  const head = i === -1 ? html : html.slice(0, i);
  const tail = i === -1 ? '' : html.slice(i);
  try {
    const headGz = zlib.gzipSync(Buffer.from(head, 'utf-8'), { level: 9 });
    const tailGz = zlib.gzipSync(Buffer.from(tail, 'utf-8'), { level: 9 });
    cachedStudy = { head, tail, headGz, tailGz };
  } catch (err) {
    cachedStudy = { head, tail };
  }
  return cachedStudy;
}

function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function subscriptionDetails(user: User) {
  if (user.role === 'admin' || !user.access_expires_at) {
    return { status: 'Active', remaining: 'No expiry', warning: '' };
  }
  const days = Math.ceil((new Date(user.access_expires_at).getTime() - Date.now()) / 86400000);
  return {
    status: 'Active',
    remaining: days <= 0 ? 'Expired' : days + ' day' + (days === 1 ? '' : 's') + ' remaining',
    warning:
      days > 0 && days <= 7
        ? 'Your access expires in ' + days + ' day' + (days === 1 ? '' : 's') + '. Contact an administrator if you need more time.'
        : '',
  };
}

function buildSessionCard(user: User): string {
  const s = subscriptionDetails(user);
  const warning = s.warning
    ? `<div id="la-expiry-warning" role="status"><div class="la-expiry-copy"><strong>Access ending soon</strong><span>${esc(s.warning)}</span></div>${user.role !== 'admin' ? '<button id="la-request-extension" type="button">Request Extension</button>' : ''}</div>`
    : '';
  return `
<section id="la-auth-bar" class="la-session-card-root" role="region" aria-label="LAST ATTEMPT subscription and session controls">
  <div class="la-panel">
    <div class="la-heading"><span class="la-eyebrow">LAST ATTEMPT subscription</span><strong>${esc(user.name || user.email || 'Authenticated user')}</strong><small>Active session</small></div>
    <div class="la-metrics">
      <div><span>Status</span><strong>${s.status}</strong></div>
      <div><span>Access remaining</span><strong>${esc(s.remaining)}</strong></div>
    </div>
    ${warning}
    <div class="la-actions">
      ${user.role === 'admin' ? '<a class="la-link" href="/admin/access">Admin Portal</a>' : ''}
      <a class="la-link" href="/">Back</a>
    </div>
  </div>
</section>
<style>
#la-auth-bar, la-session-card#laSession, #laSession{max-width:1100px;margin:28px auto 32px;padding:0 16px;font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box}
#la-auth-bar.la-hidden{display:none}
.la-panel{display:grid;grid-template-columns:minmax(220px,1.15fr) minmax(180px,.85fr);gap:16px 24px;align-items:center;padding:20px 24px;border:1px solid var(--border-color);border-radius:18px;background:var(--card-bg);color:var(--text-main);box-shadow:var(--shadow-md);box-sizing:border-box}
.la-heading strong,.la-heading small{display:block}
.la-heading strong{color:var(--text-main);font-size:1.08rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.la-heading small{color:var(--text-muted);margin-top:2px;font-size:.7rem}
.la-eyebrow{display:block;color:var(--primary-color);font-size:.7rem;font-weight:800;text-transform:uppercase;letter-spacing:.12em;margin-bottom:3px}
.la-metrics{display:flex;justify-content:flex-end;align-items:center;gap:24px;text-align:right}
.la-metrics span{display:block;color:var(--text-muted);font-size:.7rem}
.la-metrics strong{display:block;color:var(--text-main);font-size:.95rem}
.la-actions{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:4px}
.la-link{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border:1px solid var(--border-color);border-radius:999px;padding:7px 22px;background:var(--card-bg);color:var(--primary-color);text-decoration:none;font:600 .8rem/1.2 Inter,sans-serif;white-space:nowrap;cursor:pointer;transition:all .15s ease;box-sizing:border-box}
.la-link:hover{background:var(--bg-color);color:var(--primary-light);border-color:var(--primary-color)}
#la-expiry-warning{grid-column:1/-1;padding:10px 14px;display:flex;flex-wrap:wrap;gap:8px 12px;justify-content:space-between;align-items:center;border:1px solid #f59e0b;border-radius:12px;background:#fffbeb;color:#78350f;font:500 .78rem Inter,sans-serif;box-sizing:border-box}
.la-expiry-copy{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}
#la-expiry-warning strong{color:#92400e}
#la-request-extension{border:1px solid #b45309;border-radius:999px;padding:6px 13px;background:#f59e0b;color:#451a03;font:700 .72rem Inter,sans-serif;cursor:pointer;white-space:nowrap;box-sizing:border-box}

/* Fallback selectors for la-session-card */
div#notesView > la-session-card#laSession, la-session-card#laSession, la-session-card{display:block;max-width:1100px;margin:24px auto 32px;box-sizing:border-box}
div#notesView > la-session-card#laSession .action-buttons, la-session-card .action-buttons{display:flex!important;align-items:center!important;justify-content:center!important;gap:12px!important;flex-wrap:wrap!important;margin-top:14px!important}
div#notesView > la-session-card#laSession .btn-action, la-session-card .btn-action{flex:0 0 auto!important;width:auto!important;min-width:100px!important;max-width:160px!important;min-height:36px!important;padding:7px 20px!important;font-size:.8rem!important;text-align:center!important}

@media (max-width:640px){
 #la-auth-bar, la-session-card#laSession, #laSession{margin-top:20px;margin-bottom:24px;padding:0 12px}
 .la-panel{display:flex;flex-direction:column;align-items:stretch;gap:12px;padding:16px 14px;border-radius:16px}
 .la-heading strong{font-size:.92rem}
 .la-metrics{display:flex;justify-content:space-around;align-items:center;text-align:center;gap:10px;padding:8px 12px;border:1px solid var(--border-color);border-radius:12px;background:rgba(0,0,0,.02);box-sizing:border-box}
 .la-metrics > div{flex:1 1 0}
 .la-metrics span{font-size:.66rem;color:var(--text-muted);margin-bottom:2px}
 .la-metrics strong{font-size:.84rem;color:var(--text-main)}
 .la-actions{width:100%;display:flex;justify-content:center;align-items:center;gap:10px;flex-wrap:wrap;margin-top:2px}
 .la-link{flex:0 0 auto;width:auto;min-width:100px;max-width:160px;min-height:34px;padding:6px 16px;font-size:.74rem;text-align:center}
 #la-expiry-warning{padding:8px 12px;font-size:.72rem;justify-content:center;text-align:center}
 .la-expiry-copy{justify-content:center;text-align:center}
 #la-request-extension{flex:0 0 auto;padding:5px 12px;font-size:.7rem}

 div#notesView > la-session-card#laSession .action-buttons, la-session-card .action-buttons{flex-direction:row!important;justify-content:center!important;gap:10px!important}
 div#notesView > la-session-card#laSession .btn-action, la-session-card .btn-action{flex:0 0 auto!important;width:auto!important;min-width:100px!important;max-width:160px!important;min-height:34px!important;padding:6px 16px!important;font-size:.74rem!important}
 div#notesView > la-session-card#laSession .stats-grid, la-session-card .stats-grid{grid-template-columns:1fr 1fr!important;gap:8px!important}
 div#notesView > la-session-card#laSession .stat-card, la-session-card .stat-card{padding:8px 12px!important;border-radius:12px!important}
}
body > div[role="alertdialog"]{position:fixed;inset:0;z-index:2000;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.78);backdrop-filter:blur(8px);font-family:Inter,sans-serif}
.la-expiry-card{width:min(100%,380px);padding:28px;border-radius:20px;background:#1e293b;color:#f8fafc;text-align:center}
</style>
<script>
(function(){
  var ch='last-attempt-auth-sync', bc=('BroadcastChannel' in window)?new BroadcastChannel(ch):null, shown=false;
  function showExpired(){ if(shown) return; shown=true; var o=document.createElement('div'); o.setAttribute('role','alertdialog'); o.innerHTML='<div class="la-expiry-card"><strong>Your session expired</strong><p style="margin:9px 0 0;font-size:.82rem">Redirecting to sign in...</p></div>'; document.body.appendChild(o); setTimeout(function(){ window.location.replace('/?session=expired'); },1300); }
  function check(){ fetch('/api/auth/session',{credentials:'include',cache:'no-store'}).then(function(r){ if(r.status===401||r.status===403) showExpired(); }).catch(function(){}); }
  setInterval(check,60000);
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='visible') check(); });
  var btn=document.getElementById('la-request-extension');
  if(btn) btn.addEventListener('click',function(){ btn.disabled=true; btn.textContent='Sending...';
    fetch('/api/gateway/extension-request',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({requested_duration:'1 Month',reason:'Extension request from study session'})})
      .then(function(r){ if(!r.ok) throw new Error('x'); btn.textContent='Request sent'; })
      .catch(function(){ btn.disabled=false; btn.textContent='Try again'; }); });
  var bar=document.getElementById('la-auth-bar'), qv=document.getElementById('quizView');
  function sync(){ var home=!qv||qv.style.display==='none'||qv.style.display===''; if(bar) bar.classList.toggle('la-hidden',!home); }
  if(qv) new MutationObserver(sync).observe(qv,{attributes:true,attributeFilter:['style']}); sync();
  if(bc) bc.addEventListener('message',function(e){ if(e.data&&e.data.type==='logout') window.location.replace('/'); });
  window.addEventListener('storage',function(e){ if(e.key==='last-attempt-auth-state'&&e.newValue==='logged-out') window.location.replace('/'); });
})();
</script>`;
}

function deliverStudy(req: Request, res: Response) {
  const study = loadStudy();
  if (!study) {
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

  const cardHtml = buildSessionCard(req.user!);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-cache');

  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (typeof acceptEncoding === 'string' && acceptEncoding.includes('gzip')) {
    try {
      if (study.headGz && study.tailGz) {
        const cardGz = zlib.gzipSync(Buffer.from(cardHtml, 'utf-8'), { level: 9 });
        res.setHeader('Content-Encoding', 'gzip');
        res.send(Buffer.concat([study.headGz, cardGz, study.tailGz]));
        return;
      }
      const full = study.head + cardHtml + study.tail;
      const gz = zlib.gzipSync(Buffer.from(full, 'utf-8'), { level: 4 });
      res.setHeader('Content-Encoding', 'gzip');
      res.send(gz);
      return;
    } catch (e) {
      console.warn('Gzip delivery fallback:', e);
    }
  }

  res.send(study.head + cardHtml + study.tail);
}

studyRouter.use(requireActiveStudyAccess);

studyRouter.get('/', deliverStudy);
studyRouter.get('/index.html', deliverStudy);
studyRouter.get('/*', deliverStudy);
