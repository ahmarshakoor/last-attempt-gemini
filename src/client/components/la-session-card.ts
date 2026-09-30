// <la-session-card> : Last Attempt subscription / session card
import { auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const CACHE_KEY = 'last_attempt_cached_session';

interface SessionData {
  name?: string;
  email?: string;
  avatar?: string;
  isGoogle?: boolean;
  admin?: boolean;
  status?: string;
  expiry?: string;
}

function getStoredSession(): SessionData | null {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(CACHE_KEY) : null;
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore parse error
  }
  return null;
}

function storeSession(data: SessionData): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    // Ignore storage quota/security error
  }
}

let authListenerRegistered = false;
const activeCards = new Set<LASessionCard>();

function registerAuthListener(card: LASessionCard): void {
  activeCards.add(card);
  if (authListenerRegistered) return;
  authListenerRegistered = true;

  // Single auth fetch / listener
  const token = typeof window !== 'undefined' ? localStorage.getItem('last_attempt_token') : null;
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  fetch('/api/auth/me', { headers, credentials: 'include' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data && data.user) {
        const u = data.user;
        const isOwner = u.email?.toLowerCase() === 'drahmarshakoor@gmail.com' || u.role === 'admin';
        const expiryText = u.access_expires_at
          ? `Expires ${new Date(u.access_expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
          : 'Lifetime Access';
        const sessionData: SessionData = {
          name: u.name || u.email?.split('@')[0] || 'Verified Examinee',
          email: u.email,
          avatar: u.avatar_url || '',
          isGoogle: u.auth_provider_id === 'google',
          admin: isOwner,
          status: u.access_status ? (u.access_status.charAt(0).toUpperCase() + u.access_status.slice(1)) : 'Active',
          expiry: isOwner ? 'Lifetime Access' : expiryText,
        };
        storeSession(sessionData);
        activeCards.forEach((c) => c.applySession(sessionData));
      }
    })
    .catch((err) => {
      console.warn('[la-session-card] Session sync note:', err);
    });

  try {
    onAuthStateChanged(auth, (fbUser) => {
      if (fbUser && fbUser.email) {
        const isOwner = fbUser.email.toLowerCase() === 'drahmarshakoor@gmail.com';
        const cached = getStoredSession();
        const sessionData: SessionData = {
          name: fbUser.displayName || cached?.name || fbUser.email.split('@')[0],
          email: fbUser.email,
          avatar: fbUser.photoURL || cached?.avatar || '',
          isGoogle: true,
          admin: isOwner || (cached ? Boolean(cached.admin) : false),
          status: cached?.status || 'Active',
          expiry: isOwner ? 'Lifetime Access' : (cached?.expiry || 'Active Access'),
        };
        storeSession(sessionData);
        activeCards.forEach((c) => c.applySession(sessionData));
      }
    });
  } catch (e) {
    // Firebase auth not initialized or offline
  }
}

if (typeof window !== 'undefined' && !customElements.get('la-session-card')) {
  const CSS = `
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
      max-width: 100%;
      margin: 24px auto 32px;
      padding: 0;
      font-family: inherit;
      color-scheme: inherit;
      color: var(--ink, var(--text, currentColor));
    }
    :host([hidden]) {
      display: none;
    }
    * {
      box-sizing: border-box;
    }

    .session-window {
      position: relative;
      overflow: hidden;
      width: 100%;
      max-width: 100%;
      box-sizing: border-box;
      background: var(--card, #ffffff);
      border: 1px solid var(--border, var(--line, rgba(0, 0, 0, 0.12)));
      border-radius: 20px;
      padding: 24px;
      color: var(--ink, currentColor);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      transition: background-color 0.2s, border-color 0.2s;
    }

    .session-window::before {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 4px;
      background: var(--maroon, #8a0e0e);
    }

    .window-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border, var(--line, rgba(0, 0, 0, 0.08)));
    }

    .profile-group {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
      flex: 1 1 280px;
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }
    .avatar-img {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--border, var(--line, rgba(0, 0, 0, 0.12)));
      display: block;
    }
    .avatar-fallback {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: var(--maroon, #8a0e0e);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 20px;
      font-weight: 800;
      border: 1px solid var(--border, var(--line, rgba(0, 0, 0, 0.12)));
    }
    .status-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: var(--green, #16a34a);
      border: 2px solid var(--card, #ffffff);
    }

    .profile-info {
      min-width: 0;
      flex: 1;
    }
    .brand-eyebrow {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted, #7d6b66);
      flex-wrap: wrap;
    }
    .role-pill {
      padding: 2px 10px;
      border-radius: 9999px;
      background: var(--chip, var(--maroon-light, rgba(138, 14, 14, 0.08)));
      border: 1px solid var(--border, var(--line, rgba(138, 14, 14, 0.2)));
      color: var(--maroon, #8a0e0e);
      font-size: 11px;
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0;
    }
    .role-pill.admin-badge {
      background: var(--maroon, #8a0e0e);
      color: #ffffff;
      border-color: var(--maroon, #8a0e0e);
    }

    .user-name {
      margin: 4px 0 0;
      font-size: 20px;
      font-weight: 800;
      line-height: 1.25;
      color: var(--ink, currentColor);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .google-verified-chip {
      margin-top: 5px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 2px 9px;
      border-radius: 9999px;
      background: var(--green-bg, #f0fdf4);
      border: 1px solid var(--green, rgba(22, 163, 74, 0.3));
      color: var(--green, #166534);
      font-size: 11px;
      font-weight: 600;
    }
    .google-verified-chip svg {
      width: 12px;
      height: 12px;
      flex-shrink: 0;
    }
    .google-verified-chip .check-mark {
      font-weight: 800;
      color: var(--green, #15803d);
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .stat-card {
      padding: 12px 16px;
      border-radius: 14px;
      background: var(--chip, var(--bg, #fdfbf7));
      border: 1px solid var(--border, var(--line, rgba(0, 0, 0, 0.08)));
      box-sizing: border-box;
    }
    .stat-card.status-active {
      background: var(--green-bg, #ecfdf5);
      border-color: var(--green, #bbf7d0);
    }
    .stat-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: var(--muted, #7d6b66);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      margin-top: 4px;
      font-size: 15px;
      font-weight: 700;
      color: var(--ink, currentColor);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-card.status-active .stat-value {
      color: var(--green, #14532d);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--green, #16a34a);
    }

    /* BUTTONS: Mobile-First Optimization */
    .action-buttons {
      display: flex !important;
      flex-direction: row !important;
      align-items: center !important; /* CRITICAL: prevents vertical stretch */
      justify-content: stretch !important;
      gap: 10px !important;
      width: 100% !important;
      max-width: 100% !important;
      margin-top: 18px !important;
      box-sizing: border-box !important;
    }

    .btn-action {
      box-sizing: border-box !important;
      height: 44px !important;
      min-height: 44px !important;
      max-height: 44px !important;
      flex: 1 1 0px !important; /* Each button takes equal width */
      width: auto !important;
      padding: 0 14px !important;
      font-family: inherit !important;
      font-size: 14px !important;
      font-weight: 600 !important; /* semi-bold */
      line-height: 42px !important;
      white-space: nowrap !important; /* on one line */
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      border-radius: 9999px !important; /* fully rounded pill */
      border: 1px solid var(--border, var(--line, rgba(0, 0, 0, 0.15))) !important; /* thin border */
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;
      background: var(--card, #ffffff);
      color: var(--ink, currentColor);
      text-decoration: none !important;
      transition: opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
      align-self: auto !important; /* ensures no parent stretches vertically */
    }

    .btn-action:hover {
      background: var(--chip, var(--maroon-light, rgba(138, 14, 14, 0.08)));
      border-color: var(--maroon, #8a0e0e);
    }
    .btn-action:active {
      transform: scale(0.985);
    }

    .btn-action.admin-btn {
      background: var(--maroon, #8a0e0e) !important;
      color: #ffffff !important;
      border-color: var(--maroon, #8a0e0e) !important;
    }
    .btn-action.admin-btn:hover {
      background: var(--maroon-dark, var(--maroon-deep, #630808)) !important;
      border-color: var(--maroon-dark, var(--maroon-deep, #630808)) !important;
    }

    .btn-action svg {
      width: 15px !important;
      height: 15px !important;
      flex-shrink: 0 !important;
    }

    /* Small phones under 360px: stack vertically */
    @media (max-width: 359px) {
      .action-buttons {
        flex-direction: column !important;
        gap: 10px !important;
      }
      .btn-action {
        width: 100% !important;
        flex: 0 0 44px !important;
        height: 44px !important;
        min-height: 44px !important;
        max-height: 44px !important;
        line-height: 42px !important;
      }
    }

    /* BUTTONS: DESKTOP */
    @media (min-width: 768px) {
      .action-buttons {
        flex-direction: row !important;
        justify-content: flex-start !important;
        width: auto !important;
        gap: 10px !important;
        margin-top: 18px !important;
      }
      .btn-action {
        height: 40px !important;
        min-height: 40px !important;
        max-height: 40px !important;
        line-height: 38px !important;
        flex: 0 0 auto !important;
        width: auto !important;
        padding: 0 16px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
      }
    }

    /* Footer Notes */
    .window-footer {
      margin-top: 18px;
      padding-top: 12px;
      border-top: 1px dashed var(--border, var(--line, rgba(0, 0, 0, 0.12)));
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 11.5px;
      color: var(--muted, #7d6b66);
    }
    .badge-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 500;
    }
    .badge-pill svg {
      width: 13px;
      height: 13px;
      color: var(--maroon, #8a0e0e);
    }

    /* SKELETON PLACEHOLDER STYLES */
    @keyframes skeleton-shimmer {
      0%, 100% { opacity: 0.45; }
      50% { opacity: 0.85; }
    }
    .skeleton-el {
      background: var(--border, var(--line, rgba(0, 0, 0, 0.12)));
      border-radius: 6px;
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
    }
    .skeleton-avatar {
      width: 54px;
      height: 54px;
      border-radius: 50%;
      background: var(--border, var(--line, rgba(0, 0, 0, 0.12)));
      animation: skeleton-shimmer 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }
  `;

  const GOOGLE_BADGE_HTML = `
    <div class="google-verified-chip" title="Verified with Google Authentication">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
      </svg>
      <span>Verified Google Account</span>
      <span class="check-mark">✓</span>
    </div>
  `;

  class LASessionCard extends HTMLElement {
    static get observedAttributes() {
      return ['name', 'admin', 'status', 'expiry', 'avatar', 'is-google', 'back-href', 'admin-href'];
    }

    private _sessionData: SessionData | null = null;
    private _isRendered = false;

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      // 1. Immediate initialization from cache or attributes
      this._loadInitialData();
      this.render();

      // 2. Register with singleton auth listener
      registerAuthListener(this);
    }

    disconnectedCallback() {
      activeCards.delete(this);
    }

    attributeChangedCallback() {
      if (this.isConnected) {
        this.render();
      }
    }

    private _loadInitialData() {
      // Attributes take precedence if present
      const nameAttr = this.getAttribute('name');
      if (nameAttr) {
        this._sessionData = {
          name: nameAttr,
          status: this.getAttribute('status') || 'Active',
          expiry: this.getAttribute('expiry') || 'Lifetime Access',
          avatar: this.getAttribute('avatar') || undefined,
          isGoogle: this.hasAttribute('is-google'),
          admin: this.hasAttribute('admin') && this.getAttribute('admin') !== 'false',
        };
        return;
      }

      // Check fast localStorage cache
      const cached = getStoredSession();
      if (cached) {
        this._sessionData = cached;
      }
    }

    set session(s: SessionData) {
      this._sessionData = s;
      storeSession(s);
      this.render();
    }

    get session(): SessionData | null {
      return this._sessionData;
    }

    applySession(s: SessionData) {
      this._sessionData = s;
      // Update only this card without touching the rest of the document
      this.render();
    }

    go(kind: string) {
      const ev = new CustomEvent('la-' + kind, { bubbles: true, composed: true, cancelable: true });
      if (!this.dispatchEvent(ev)) return;
      const href = this.getAttribute(kind + '-href');
      if (href) {
        location.href = href;
      } else if (kind === 'admin') {
        location.href = '/admin/access';
      } else if (kind === 'back') {
        location.href = '/';
      }
    }

    render() {
      const r = this.shadowRoot;
      if (!r) return;

      const data = this._sessionData;
      const nameAttr = this.getAttribute('name');
      const name = data?.name || nameAttr || '';

      // If no data and no cache, render immediate skeleton placeholder
      if (!name) {
        r.innerHTML = `
          <style>${CSS}</style>
          <section class="session-window" aria-label="Loading Session Information" aria-busy="true">
            <div class="window-top">
              <div class="profile-group">
                <div class="skeleton-avatar"></div>
                <div class="profile-info">
                  <div class="skeleton-el" style="width: 120px; height: 12px; margin-bottom: 8px;"></div>
                  <div class="skeleton-el" style="width: 180px; height: 20px;"></div>
                </div>
              </div>
            </div>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="skeleton-el" style="width: 70px; height: 10px; margin-bottom: 6px;"></div>
                <div class="skeleton-el" style="width: 90px; height: 16px;"></div>
              </div>
              <div class="stat-card">
                <div class="skeleton-el" style="width: 80px; height: 10px; margin-bottom: 6px;"></div>
                <div class="skeleton-el" style="width: 130px; height: 16px;"></div>
              </div>
            </div>
            <div class="action-buttons">
              <div class="skeleton-el" style="height: 44px; flex: 1; border-radius: 9999px;"></div>
            </div>
          </section>
        `;
        return;
      }

      const status = data?.status || this.getAttribute('status') || 'Active';
      const expiry = data?.expiry || this.getAttribute('expiry') || 'Lifetime Access';
      const isAdmin = data?.admin !== undefined ? data.admin : (this.hasAttribute('admin') && this.getAttribute('admin') !== 'false');
      const isGoogle = data?.isGoogle !== undefined ? data.isGoogle : this.hasAttribute('is-google');
      const avatarUrl = data?.avatar || this.getAttribute('avatar');
      const initial = name ? name.charAt(0).toUpperCase() : 'U';

      const avatarMarkup = avatarUrl
        ? `<img src="${avatarUrl}" alt="${name}" class="avatar-img" />`
        : `<div class="avatar-fallback">${initial}</div>`;

      const googleMarkup = isGoogle ? GOOGLE_BADGE_HTML : '';
      const roleMarkup = isAdmin
        ? `<span class="role-pill admin-badge">Master Admin</span>`
        : `<span class="role-pill">Verified Examinee</span>`;

      // BUTTONS: Admin Portal on the left, Back to Gateway on the right for admins.
      // Normal users see ONLY Back to Gateway, full width.
      const buttonsMarkup = `
        <div class="action-buttons">
          ${isAdmin ? `
            <button type="button" class="btn-action admin-btn" data-action="admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Admin Portal</span>
            </button>
          ` : ''}
          <button type="button" class="btn-action back-btn" data-action="back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            <span>Back to Gateway</span>
          </button>
        </div>
      `;

      r.innerHTML = `
        <style>${CSS}</style>
        <section class="session-window" aria-label="Subscription and Session Information">
          <div class="window-top">
            <div class="profile-group">
              <div class="avatar-wrapper">
                ${avatarMarkup}
                <div class="status-indicator" title="Session Synchronized"></div>
              </div>
              <div class="profile-info">
                <p class="brand-eyebrow">
                  <span>LAST ATTEMPT SESSION</span>
                  ${roleMarkup}
                </p>
                <h3 class="user-name">${name}</h3>
                ${googleMarkup}
              </div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card status-active">
              <span class="stat-label">Access Status</span>
              <div class="stat-value">
                <span class="pulse-dot"></span>
                <span>${status}</span>
              </div>
            </div>
            <div class="stat-card">
              <span class="stat-label">Access Duration</span>
              <div class="stat-value">
                <span>${expiry}</span>
              </div>
            </div>
          </div>

          ${buttonsMarkup}

          <div class="window-footer">
            <span class="badge-pill">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              Encrypted Study Vault
            </span>
            <span>Dr. Ahmar Shakoor Medical Companion</span>
          </div>
        </section>
      `;

      // Attach event listeners to buttons
      const adminBtn = r.querySelector('[data-action="admin"]');
      if (adminBtn) {
        adminBtn.addEventListener('click', () => this.go('admin'));
      }
      const backBtn = r.querySelector('[data-action="back"]');
      if (backBtn) {
        backBtn.addEventListener('click', () => this.go('back'));
      }
    }
  }

  customElements.define('la-session-card', LASessionCard);
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'la-session-card': any;
    }
  }
}

export {};
