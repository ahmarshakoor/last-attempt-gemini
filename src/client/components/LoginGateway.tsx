import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GatewayInfo, User } from '../../types';
import {
  Shield,
  BookOpen,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Phone,
  Mail,
  User as UserIcon,
  LogOut,
  Bell,
  Settings,
  Lock,
  Info
} from 'lucide-react';
import { NotificationsDrawer } from './NotificationsDrawer';
import { ExtensionRequestModal } from './ExtensionRequestModal';
import { authFetch, getStoredAppSessionToken } from '../utils/api';
import { auth } from '../firebase';

interface Props {
  onNavigateAdmin: () => void;
}

const GatewayInfoCard: React.FC<{ info: GatewayInfo }> = ({ info }) => {
  const heading = (info.heading || '').trim();
  const message = (info.message || '').trim();
  const additionalNotes = (info.additional_notes || '').trim();
  const pricing = (info.pricing || '').trim();
  const whatsapp = (info.whatsapp || '').trim();
  const whatsappDigits = whatsapp.replace(/[^0-9]/g, '');
  const email = (info.email || '').trim();

  if (!info.visible || ![heading, message, additionalNotes, pricing, whatsapp, email].some(Boolean)) {
    return null;
  }

  return (
    <aside className="gateway-info-card" aria-labelledby="gateway-info-heading">
      <div className="gateway-info-heading-row">
        <span className="gateway-info-icon" aria-hidden="true"><Info size={18} /></span>
        <h3 id="gateway-info-heading" className="gateway-info-title">{heading || 'Information for students'}</h3>
      </div>
      {message && <p className="gateway-info-copy">{message}</p>}
      {additionalNotes && <p className="gateway-info-copy gateway-info-notes">{additionalNotes}</p>}
      {(pricing || whatsapp || email) && (
        <div className="gateway-info-meta">
          {pricing && <span className="gateway-info-pill">{pricing}</span>}
          {whatsapp && (whatsappDigits ? (
            <a className="gateway-info-pill gateway-info-link" href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer">
              <Phone size={14} aria-hidden="true" /> WhatsApp {whatsapp}
            </a>
          ) : <span className="gateway-info-pill">WhatsApp {whatsapp}</span>)}
          {email && (
            <a className="gateway-info-pill gateway-info-link" href={`mailto:${email}`}>
              <Mail size={14} aria-hidden="true" /> {email}
            </a>
          )}
        </div>
      )}
    </aside>
  );
};

export const LoginGateway: React.FC<Props> = ({ onNavigateAdmin }) => {
  const { user, loginWithGoogle, login, register, logout, refreshUser } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Terms and Privacy modal
  const [modalType, setModalType] = useState<'terms' | 'privacy' | null>(null);

  // Gateway Info from DB
  const [gatewayInfo, setGatewayInfo] = useState<GatewayInfo | null>(null);

  // Notifications drawer state
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Extension request modal
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);

  const formatExpiryDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Lifetime access';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Lifetime access';
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `Expires ${day} ${month} ${year}`;
  };

  // Check URL error params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'unauthenticated') {
      setFormError('Please sign in to access the protected study material.');
    } else if (err === 'expired') {
      setFormError('Your access has expired. Please request an extension.');
    } else if (err === 'pending') {
      setFormError('Your account is awaiting administrator approval.');
    } else if (err === 'revoked') {
      setFormError('Your access has been revoked by an administrator.');
    } else if (err === 'unauthorized_admin') {
      setFormError('Administrator credentials required to open the Admin Portal.');
    }
  }, []);

  // Match the persisted display preference used by the study page.
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lastAttemptTheme');
      const savedDark = localStorage.getItem('lastAttemptDark');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
      } else if (savedDark !== null) {
        document.body.classList.toggle('dark-mode', savedDark === '1');
      }
    } catch {
      // Leave the current page theme unchanged when storage is unavailable.
    }
  }, []);

  // Fetch gateway info
  useEffect(() => {
    fetch('/api/gateway/info')
      .then(res => res.json())
      .then(data => {
        if (data.info) setGatewayInfo(data.info);
      })
      .catch(err => console.error('Failed to load gateway info', err));
  }, []);

  // Initial unread notifications check
  useEffect(() => {
    if (user) {
      authFetch('/api/notifications')
        .then(res => res.json())
        .then(data => {
          const unread = (data.notifications || []).filter((n: any) => !n.is_read).length;
          setUnreadNotifs(unread);
        })
        .catch(console.error);
    }
  }, [user]);

  const handleGoogleSignIn = async () => {
    setFormError(null);
    setFormSuccess(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setFormError('Google sign-in window was closed before completion.');
      } else if (err.code === 'auth/popup-blocked') {
        setFormError('Browser popup blocked. Please allow popups for this site to sign in with your Google account.');
      } else {
        setFormError(err.message || 'Google account sign-in failed. Please try again.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    try {
      if (isRegistering) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      setFormError(err.message || 'Authentication error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEnterStudy = async () => {
    const token = auth.currentUser
      ? await auth.currentUser.getIdToken()
      : getStoredAppSessionToken();
    if (token) {
      window.location.href = `/study?token=${encodeURIComponent(token)}`;
    } else {
      window.location.href = '/study';
    }
  };

  const isExpired = user?.access_expires_at
    ? new Date(user.access_expires_at).getTime() < Date.now()
    : false;

  const isActive = user?.access_status === 'active' && !isExpired;

  // If user is already authenticated, show the personalized portal dashboard styled according to the login page
  if (user) {
    const daysRemaining = user.access_expires_at
      ? Math.max(0, Math.ceil((new Date(user.access_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <main className="shell authenticated-shell">
        <header className="brand">
          <h1>LAST ATTEMPT</h1>
          <p className="by">by Dr. Ahmar Shakoor</p>
          <p className="tagline">Every high-yield topic, flagged and ready for your exam.</p>

          <ul className="badges">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z"/>
                <path d="m9 12 2 2 4-4"/>
              </svg>
              {user.role === 'admin' ? 'Master Administrator' : 'Verified Examinee'}
            </li>
            {user.auth_provider_id === 'google' && (
              <li>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Google Verified
              </li>
            )}
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 12a8 8 0 1 1-2.3-5.7"/>
                <path d="M20 4v5h-5"/>
              </svg>
              Session Active
            </li>
          </ul>

          <ul className="systems" aria-hidden="true">
            <li>Neurology</li>
            <li>Cardiovascular</li>
            <li>Respiratory</li>
            <li>GIT &amp; General Surgery</li>
            <li>Renal</li>
          </ul>
        </header>

        <section className="panel session-panel">
          <div className="card session-card">
            {/* User Session Bar */}
            <div className="session-user-bar flex items-center justify-between pb-4 mb-4 border-b border-[var(--line)]">
              <div className="session-profile flex items-center gap-3 min-w-0">
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="w-11 h-11 rounded-full object-cover border-2 border-[var(--line)] shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[var(--maroon)] text-white flex items-center justify-center font-bold text-sm shrink-0">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 text-left leading-tight">
                  <span className="font-bold text-[var(--ink)] block text-sm truncate">
                    {user.name}
                  </span>
                  <span className="text-[11px] text-[var(--muted)] truncate block">
                    {user.role === 'admin' ? 'Master Admin' : 'Verified Examinee'}
                  </span>
                </div>
              </div>

              <div className="session-actions flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNotifOpen(true)}
                  className="relative p-2 rounded-full hover:bg-[var(--chip)] text-[var(--muted)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[var(--maroon)] text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadNotifs}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="p-2 rounded-full hover:bg-[var(--chip)] text-[var(--muted)] hover:text-[var(--maroon)] transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {gatewayInfo && <GatewayInfoCard info={gatewayInfo} />}

            <h2>Study Dashboard</h2>
            <p className="sub">
              {isActive
                ? 'Your access is active. Click below to continue your medical exam prep.'
                : user.access_status === 'pending'
                ? 'Your registration is awaiting administrator approval.'
                : 'Your access period has expired. Request an extension below.'}
            </p>

            {/* Primary Study CTA Button */}
            {isActive ? (
              <button
                type="button"
                onClick={handleEnterStudy}
                className="study-btn"
              >
                <BookOpen className="shrink-0" />
                <span>Enter study portal</span>
                <ArrowRight className="shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsExtModalOpen(true)}
                className="study-btn"
                style={{ background: 'var(--ink)', borderColor: 'var(--ink)' }}
              >
                <Clock className="shrink-0" />
                <span>Request Access Extension</span>
                <ArrowRight className="shrink-0" />
              </button>
            )}

            {/* Expiry Pill directly below that button */}
            <div className="flex justify-center mt-[10px]">
              <div className="expiry-pill">
                {formatExpiryDate(user.access_expires_at)}
              </div>
            </div>

            {/* Admin Portal Button (Dr. Ahmar Shakoor) */}
            {user.role === 'admin' && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="admin-btn mt-3"
              >
                <Settings />
                <span>Open Admin Portal</span>
              </button>
            )}

            {/* Secondary actions */}
            <div className="mt-4 pt-3 border-t border-[var(--line)] flex items-center justify-center gap-4 text-xs font-semibold text-[var(--muted)]">
              {isActive && (
                <button
                  type="button"
                  onClick={() => setIsExtModalOpen(true)}
                  className="hover:text-[var(--maroon)] transition-colors cursor-pointer"
                >
                  Request Extension
                </button>
              )}
              {gatewayInfo?.whatsapp && (
                <a
                  href={`https://wa.me/${gatewayInfo.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-700 transition-colors flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5" /> WhatsApp Support
                </a>
              )}
            </div>

            {/* Trust Badges */}
            <ul className="trust">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 12a8 8 0 1 1-2.3-5.7"/>
                  <path d="M20 4v5h-5"/>
                </svg>
                Session synchronized
              </li>
            </ul>

            <p className="note">
              Authorized study material by{' '}
              <a href="#terms" onClick={(e) => { e.preventDefault(); setModalType('terms'); }}>
                Dr. Ahmar Shakoor
              </a>
              . Single examinee license.
            </p>
          </div>
        </section>

        <NotificationsDrawer
          isOpen={isNotifOpen}
          onClose={() => setIsNotifOpen(false)}
          onUpdateUnreadCount={(c) => setUnreadNotifs(c)}
        />

        <ExtensionRequestModal
          isOpen={isExtModalOpen}
          onClose={() => setIsExtModalOpen(false)}
          onSuccess={() => refreshUser()}
          currentExpiry={user?.access_expires_at ?? null}
        />

        {/* Terms & Privacy Modal */}
        {modalType && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[var(--card)] max-w-md w-full rounded-3xl p-6 border border-[var(--line)] space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                <h3 className="font-bold text-lg text-[var(--ink)]">
                  {modalType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
                </h3>
                <button
                  onClick={() => setModalType(null)}
                  className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs text-[var(--muted)] leading-relaxed space-y-2 max-h-64 overflow-y-auto pr-1">
                {modalType === 'terms' ? (
                  <>
                    <p>LAST ATTEMPT is an independent medical study companion authored by Dr. Ahmar Shakoor for candidates preparing for examination milestones.</p>
                    <p>Study materials, algorithms, diagnostic pathways, and pearls are licensed for single-user educational purposes only. Redistribution without permission is strictly prohibited.</p>
                    <p>Access privileges may be managed, updated, or revoked in accordance with academic integrity guidelines.</p>
                  </>
                ) : (
                  <>
                    <p>We respect your privacy. Authentication is handled securely through Google Identity Services.</p>
                    <p>We only retrieve your verified email address, display name, and avatar to personalize your question bank progress, bookmarks, and notes.</p>
                    <p>Your session information is never shared or sold to third parties.</p>
                  </>
                )}
              </div>
              <button
                onClick={() => setModalType(null)}
                className="w-full py-2.5 rounded-xl bg-[var(--maroon)] text-white text-xs font-bold hover:bg-[var(--maroon-deep)] transition-colors cursor-pointer"
              >
                I Understand
              </button>
            </div>
          </div>
        )}
      </main>
    );
  }

  // ================= LOGGED OUT: EXACT UI FROM USER BRIEF =================
  return (
    <main className="shell">
      <header className="brand">
        <h1>LAST ATTEMPT</h1>
        <p className="by">by Dr. Ahmar Shakoor</p>
        <p className="tagline">Every high-yield topic, flagged and ready for your exam.</p>
        <ul className="badges">
          <li>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3 4 6v6c0 4.5 3.4 7.7 8 9 4.6-1.3 8-4.5 8-9V6l-8-3Z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
            Secured by Google
          </li>
        </ul>
        <ul className="systems" aria-hidden="true">
          <li>Neurology</li>
          <li>Cardiovascular</li>
          <li>Respiratory</li>
          <li>GIT &amp; General Surgery</li>
          <li>Renal</li>
        </ul>
      </header>

      <section className="panel">
        <div className="card">
          <div className="logo">
            <span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </span>
          </div>

          <h2>Welcome</h2>
          <p className="sub">Sign in with Google to open your notes, quizzes and saved progress.</p>

          {gatewayInfo && <GatewayInfoCard info={gatewayInfo} />}

          <button
            className={`google ${isGoogleLoading ? 'loading' : ''}`}
            type="button"
            id="googleBtn"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isSubmitting}
          >
            <svg className="g-logo" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/>
              <path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/>
            </svg>
            <span className="spinner" aria-hidden="true"></span>
            <span id="btnLabel">{isGoogleLoading ? 'Signing in' : 'Continue with Google'}</span>
          </button>

          {formError && (
            <p className="msg show" id="msg" role="alert">
              {formError}
            </p>
          )}

          {formSuccess && (
            <p className="msg show" style={{ background: '#e6f4ea', color: '#137333' }}>
              {formSuccess}
            </p>
          )}

          <ul className="trust">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 12a8 8 0 1 1-2.3-5.7"/>
                <path d="M20 4v5h-5"/>
              </svg>
              Session synchronized
            </li>
          </ul>

          {/* Collapsible Email & Password fallback for accounts */}
          <div className="mt-4 pt-3 border-t border-[var(--line)] text-center">
            <button
              type="button"
              onClick={() => { setShowEmailForm(!showEmailForm); setFormError(null); }}
              className="text-xs text-[var(--muted)] hover:text-[var(--maroon)] font-medium transition-colors cursor-pointer"
            >
              {showEmailForm ? 'Hide email sign in' : 'Have an email & password? Click here'}
            </button>
          </div>

          {showEmailForm && (
            <div className="mt-4 pt-3 border-t border-[var(--line)] animate-in fade-in duration-200">
              <div className="grid grid-cols-2 p-1 bg-[var(--chip)] rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setFormError(null); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    !isRegistering ? 'bg-[var(--card)] text-[var(--ink)]' : 'text-[var(--muted)]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setFormError(null); }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                    isRegistering ? 'bg-[var(--card)] text-[var(--ink)]' : 'text-[var(--muted)]'
                  }`}
                >
                  Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 text-left">
                {isRegistering && (
                  <div>
                    <label className="block text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. John Doe"
                      className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] focus:outline-hidden focus:border-[var(--maroon)]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@example.com"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] focus:outline-hidden focus:border-[var(--maroon)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)] focus:outline-hidden focus:border-[var(--maroon)]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-[var(--maroon)] hover:bg-[var(--maroon-deep)] text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying...' : (isRegistering ? 'Create Account' : 'Sign In with Password')}
                </button>
              </form>
            </div>
          )}

          <p className="note">
            By continuing, you agree to the{' '}
            <a href="#terms" onClick={(e) => { e.preventDefault(); setModalType('terms'); }}>
              Terms
            </a>{' '}
            and{' '}
            <a href="#privacy" onClick={(e) => { e.preventDefault(); setModalType('privacy'); }}>
              Privacy Policy
            </a>.
          </p>
        </div>
      </section>

      {/* Terms & Privacy Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--card)] max-w-md w-full rounded-3xl p-6 border border-[var(--line)] space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <h3 className="font-bold text-lg text-[var(--ink)]">
                {modalType === 'terms' ? 'Terms of Service' : 'Privacy Policy'}
              </h3>
              <button
                onClick={() => setModalType(null)}
                className="text-[var(--muted)] hover:text-[var(--ink)] p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-[var(--muted)] leading-relaxed space-y-2 max-h-64 overflow-y-auto pr-1">
              {modalType === 'terms' ? (
                <>
                  <p>LAST ATTEMPT is an independent medical study companion authored by Dr. Ahmar Shakoor for candidates preparing for examination milestones.</p>
                  <p>Study materials, algorithms, diagnostic pathways, and pearls are licensed for single-user educational purposes only. Redistribution without permission is strictly prohibited.</p>
                  <p>Access privileges may be managed, updated, or revoked in accordance with academic integrity guidelines.</p>
                </>
              ) : (
                <>
                  <p>We respect your privacy. Authentication is handled securely through Google Identity Services.</p>
                  <p>We only retrieve your verified email address, display name, and avatar to personalize your question bank progress, bookmarks, and notes.</p>
                  <p>Your session information is never shared or sold to third parties.</p>
                </>
              )}
            </div>
            <button
              onClick={() => setModalType(null)}
              className="w-full py-2.5 rounded-xl bg-[var(--maroon)] text-white text-xs font-bold hover:bg-[var(--maroon-deep)] transition-colors cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      )}
    </main>
  );
};
