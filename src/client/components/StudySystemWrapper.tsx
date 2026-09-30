import React, { useLayoutEffect, useMemo, useRef } from 'react';
import type { User } from '../../types';

interface StudySystemWrapperProps {
  user: User | null;
  isLoading: boolean;
}

function formatAccessExpiry(value: string | null): string {
  if (!value) return 'Lifetime Access';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Access term unavailable';
  return `Valid until ${date.toLocaleDateString(undefined, { dateStyle: 'medium' })}`;
}

function SessionCardSkeleton() {
  return (
    <div className="study-session-skeleton" role="status" aria-live="polite">
      <span className="study-session-skeleton-label">Restoring your secure session…</span>
      <div className="study-session-skeleton-profile">
        <span className="study-skeleton-avatar" />
        <span className="study-skeleton-lines">
          <span />
          <span />
        </span>
      </div>
      <span className="study-skeleton-block" />
      <span className="study-skeleton-button" />
    </div>
  );
}

export const StudySystemWrapper: React.FC<StudySystemWrapperProps> = ({ user, isLoading }) => {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const frameSrc = useMemo(() => `/study/index.html${window.location.search}`, []);

  useLayoutEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lastAttemptTheme');
      const savedDark = localStorage.getItem('lastAttemptDark');
      if (savedTheme === 'dark' || savedTheme === 'light') {
        document.body.classList.toggle('dark-mode', savedTheme === 'dark');
      } else if (savedDark !== null) {
        document.body.classList.toggle('dark-mode', savedDark === '1');
      }
    } catch {
      // Preserve the current theme if storage is unavailable.
    }
  }, []);

  const handleFrameLoad = () => {
    try {
      const document = frameRef.current?.contentDocument;
      if (!document) return;

      // The Session Card belongs to this React app shell. Hide any legacy copy
      // if an older/raw study document happens to include one.
      document.querySelectorAll('la-session-card, #la-session-bar, #la-bar-minimized').forEach((node) => {
        (node as HTMLElement).style.setProperty('display', 'none', 'important');
      });
    } catch (error) {
      // The study content is same-origin in production. If browser policy blocks
      // access, keep the React wrapper card visible and leave the study document alone.
      console.warn('Could not inspect the embedded study document for a duplicate session card.', error);
    }
  };

  return (
    <main className="study-system-shell">
      <section className="study-system-session" aria-label="Study session and access" aria-busy={isLoading}>
        {isLoading ? (
          <SessionCardSkeleton />
        ) : user ? (
          React.createElement('la-session-card' as any, {
            name: user.name || user.email,
            avatar: user.avatar_url || undefined,
            status: user.access_status === 'active' ? 'Active' : user.access_status,
            expiry: formatAccessExpiry(user.access_expires_at),
            admin: user.role === 'admin' ? '' : undefined,
            'is-google': user.auth_provider_id === 'google' ? '' : undefined,
            'back-href': '/',
            'admin-href': '/admin/access',
          })
        ) : (
          <div className="study-session-error" role="status">
            <strong>Session details could not be loaded.</strong>
            <a href="/">Return to the gateway</a>
          </div>
        )}
      </section>

      <section className="study-system-content" aria-label="Study materials">
        <iframe
          ref={frameRef}
          className="study-system-frame"
          src={frameSrc}
          title="LAST ATTEMPT study materials"
          onLoad={handleFrameLoad}
          referrerPolicy="same-origin"
        />
      </section>
    </main>
  );
};
