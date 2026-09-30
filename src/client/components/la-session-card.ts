// <la-session-card> : Last Attempt subscription / session card
if (typeof window !== 'undefined' && !customElements.get('la-session-card')) {
  const CSS = `
    :host {
      display: block;
      box-sizing: border-box;
      width: 100%;
      max-width: 920px;
      margin: 32px auto 40px;
      padding: 0 16px;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: var(--la-ink, #2a1a1a);
      --m: var(--la-maroon, #8a0e0e);
      --m-deep: var(--la-maroon-deep, #6b0909);
      --line: var(--la-line, #eadfd3);
      --chip: var(--la-chip, #f6e7e3);
      --muted: var(--la-muted, #7d6b66);
      --card-bg: var(--la-card, #fdfbf7);
      --ok: #15803d;
      --ok-bg: #ecfdf5;
      --ok-border: #bbf7d0;
    }
    :host([hidden]), :host(:not([name])) {
      display: none;
    }
    * { box-sizing: border-box; }

    .session-window {
      position: relative;
      overflow: hidden;
      background: var(--card-bg);
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: 28px 26px 22px;
    }
    .session-window::before {
      content: "";
      position: absolute;
      left: 0; right: 0; top: 0;
      height: 5px;
      background: #8a0e0e;
    }

    .window-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--line);
    }

    .profile-group {
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 0;
      flex: 1 1 300px;
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;
    }
    .avatar-img {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      object-fit: cover;
      border: 1.5px solid var(--line);
      display: block;
    }
    .avatar-fallback {
      width: 58px;
      height: 58px;
      border-radius: 50%;
      background: var(--m);
      color: #ffffff;
      display: grid;
      place-items: center;
      font-size: 22px;
      font-weight: 800;
      border: 1px solid var(--line);
    }
    .status-indicator {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #16a34a;
      border: 2px solid var(--card-bg);
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
      font-size: 11.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      flex-wrap: wrap;
    }
    .role-pill {
      padding: 2px 9px;
      border-radius: 999px;
      background: var(--chip);
      border: 1px solid var(--line);
      color: var(--m);
      font-size: 11px;
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0;
    }
    .role-pill.admin-badge {
      background: var(--m);
      color: #fff;
      border-color: var(--m);
    }

    .user-name {
      margin: 4px 0 0;
      font-size: 21px;
      font-weight: 800;
      line-height: 1.25;
      color: var(--la-ink, #2a1a1a);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .google-verified-chip {
      margin-top: 6px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 999px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 11.5px;
      font-weight: 600;
    }
    .google-verified-chip svg {
      width: 13px;
      height: 13px;
      flex-shrink: 0;
    }
    .google-verified-chip .check-mark {
      font-weight: 800;
      color: #15803d;
    }

    /* Stats Row */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      margin-top: 18px;
    }
    .stat-card {
      padding: 14px 18px;
      border-radius: 20px;
      background: var(--chip);
      border: 1px solid var(--line);
    }
    .stat-card.status-active {
      background: var(--ok-bg);
      border-color: var(--ok-border);
    }
    .stat-label {
      display: block;
      font-size: 11.5px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .stat-value {
      margin-top: 4px;
      font-size: 17px;
      font-weight: 700;
      color: var(--la-ink, #2a1a1a);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .stat-card.status-active .stat-value {
      color: #14532d;
    }
    .pulse-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #16a34a;
    }

    /* Actions Row */
    .action-buttons {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-top: 20px;
      flex-wrap: wrap;
    }
    .btn-action {
      flex: 1 1 200px;
      min-height: 52px;
      padding: 0 24px;
      border-radius: 999px;
      font-family: inherit;
      font-size: 15.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      border: 1.5px solid var(--line);
      background: var(--card-bg);
      color: var(--la-ink, #2a1a1a);
      transition: all 0.15s ease;
    }
    .btn-action:hover {
      border-color: var(--m);
      background: var(--chip);
    }
    .btn-action:active {
      transform: scale(0.985);
    }
    .btn-action.admin-btn {
      background: #8a0e0e;
      border-color: #8a0e0e;
      color: #ffffff;
    }
    .btn-action.admin-btn:hover {
      background: var(--m-deep);
      border-color: var(--m-deep);
    }
    .btn-action svg {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
    }

    /* Footer micro-notes */
    .window-footer {
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px dashed var(--line);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
      font-size: 12px;
      color: var(--muted);
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
      color: var(--m);
    }

    /* Mobile optimizations */
    @media (max-width: 640px) {
      :host {
        margin: 20px auto 28px;
        padding: 0 8px;
      }
      .session-window {
        padding: 20px 16px 18px;
        border-radius: 24px;
      }
      .window-top {
        gap: 12px;
        padding-bottom: 14px;
      }
      .avatar-img, .avatar-fallback {
        width: 48px;
        height: 48px;
        font-size: 18px;
      }
      .user-name {
        font-size: 18px;
      }
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 8px;
        margin-top: 14px;
      }
      .action-buttons {
        flex-direction: column;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
      }
      .btn-action {
        flex: 0 1 auto;
        width: min(100%, 240px);
        min-width: 0;
        max-width: 240px;
        height: 44px;
        min-height: 44px;
        max-height: 44px;
        padding: 0 14px;
        font-size: 14px;
        line-height: 1;
        white-space: nowrap;
      }
    }
  `;

  const HTML = `
    <section class="session-window" aria-label="Subscription and Session Information">
      <div class="window-top">
        <div class="profile-group">
          <div class="avatar-wrapper">
            <div class="avatar-box" data-avatar-slot></div>
            <div class="status-indicator" title="Session Synchronized"></div>
          </div>
          <div class="profile-info">
            <p class="brand-eyebrow">
              <span>LAST ATTEMPT SESSION</span>
              <span class="role-pill" data-role>Verified Examinee</span>
            </p>
            <h3 class="user-name" data-name></h3>
            <div class="google-badge-slot" data-google-slot></div>
          </div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card status-active" data-status-card>
          <span class="stat-label">Access Status</span>
          <div class="stat-value">
            <span class="pulse-dot"></span>
            <span data-status>Active</span>
          </div>
        </div>
        <div class="stat-card">
          <span class="stat-label">Access Duration</span>
          <div class="stat-value">
            <span data-expiry>Lifetime Access</span>
          </div>
        </div>
      </div>

      <div class="action-buttons">
        <button type="button" class="btn-action back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          <span>Back to Gateway</span>
        </button>
      </div>

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
    </section>`;

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
    static get observedAttributes() { return ['name','admin','status','expiry','avatar','is-google','back-href','admin-href']; }
    constructor() { super(); this.attachShadow({ mode: 'open' }); }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }

    set session(s: { name?: string; email?: string; avatar?: string; isGoogle?: boolean; admin?: boolean; status?: string; expiry?: string } = {}) {
      const set = (k: string, v?: string) => (v === undefined || v === null || v === '') ? this.removeAttribute(k) : this.setAttribute(k, v);
      set('name', s.name);
      set('status', s.status);
      set('expiry', s.expiry);
      set('avatar', s.avatar);
      s.isGoogle ? this.setAttribute('is-google', '') : this.removeAttribute('is-google');
      s.admin === true ? this.setAttribute('admin', '') : this.removeAttribute('admin');
    }

    go(kind: string) {
      const ev = new CustomEvent('la-' + kind, { bubbles: true, composed: true, cancelable: true });
      if (!this.dispatchEvent(ev)) return;
      const href = this.getAttribute(kind + '-href');
      if (href) location.href = href;
      else if (kind === 'back') history.back();
    }

    render() {
      const r = this.shadowRoot;
      if (!r) return;
      if (!r.firstChild) {
        r.innerHTML = `<style>${CSS}</style>${HTML}`;
        const backBtn = r.querySelector('.back-btn');
        if (backBtn) {
          backBtn.addEventListener('click', () => this.go('back'));
        }
      }

      const name = this.getAttribute('name') || '';
      const nameEl = r.querySelector('[data-name]');
      if (nameEl) nameEl.textContent = name;

      const status = this.getAttribute('status') || 'Active';
      const statusEl = r.querySelector('[data-status]');
      if (statusEl) statusEl.textContent = status;

      const expiry = this.getAttribute('expiry') || 'Lifetime Access';
      const expiryEl = r.querySelector('[data-expiry]');
      if (expiryEl) expiryEl.textContent = expiry;

      const isAdmin = this.hasAttribute('admin') && this.getAttribute('admin') !== 'false';
      const roleEl = r.querySelector('[data-role]');
      if (roleEl) {
        if (isAdmin) {
          roleEl.textContent = 'Master Admin';
          roleEl.className = 'role-pill admin-badge';
        } else {
          roleEl.textContent = 'Verified Examinee';
          roleEl.className = 'role-pill';
        }
      }

      // Avatar render
      const avatarSlot = r.querySelector('[data-avatar-slot]');
      const avatarUrl = this.getAttribute('avatar');
      if (avatarSlot) {
        if (avatarUrl) {
          avatarSlot.innerHTML = `<img src="${avatarUrl}" alt="${name}" class="avatar-img" />`;
        } else {
          const initial = name ? name.charAt(0).toUpperCase() : 'U';
          avatarSlot.innerHTML = `<div class="avatar-fallback">${initial}</div>`;
        }
      }

      // Google badge render
      const googleSlot = r.querySelector('[data-google-slot]');
      const isGoogle = this.hasAttribute('is-google');
      if (googleSlot) {
        if (isGoogle) {
          googleSlot.innerHTML = GOOGLE_BADGE_HTML;
        } else {
          googleSlot.innerHTML = '';
        }
      }

      // Admin button render
      const actions = r.querySelector('.action-buttons');
      let adminBtn = r.querySelector('button.admin-btn');
      if (isAdmin && !adminBtn && actions) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-action admin-btn';
        b.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span>Open Admin Portal</span>
        `;
        b.addEventListener('click', () => this.go('admin'));
        // Place admin button first
        actions.insertBefore(b, actions.firstChild);
      } else if (!isAdmin && adminBtn) {
        adminBtn.remove();
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