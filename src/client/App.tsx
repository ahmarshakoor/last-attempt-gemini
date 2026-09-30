import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudySystemWrapper } from './components/StudySystemWrapper';
import { ShieldAlert } from 'lucide-react';

const LoginGateway = React.lazy(() =>
  import('./components/LoginGateway').then((module) => ({ default: module.LoginGateway })),
);
const AdminPortal = React.lazy(() =>
  import('./components/AdminPortal').then((module) => ({ default: module.AdminPortal })),
);

const RouteChunkLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
    <div className="flex flex-col items-center gap-3">
      <div className="w-10 h-10 border-3 border-[#830e0d] border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{label}</span>
    </div>
  </div>
);

const MainContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  if (currentPath === '/study' || currentPath === '/study/') {
    return <StudySystemWrapper user={user} isLoading={isLoading} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#830e0d] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Loading LAST ATTEMPT...
          </span>
        </div>
      </div>
    );
  }

  // Admin Route
  if (currentPath === '/admin/access') {
    if (!user) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 max-w-md w-full text-center space-y-4 shadow-xl">
            <ShieldAlert className="w-12 h-12 text-[#830e0d] mx-auto" />
            <h2 className="text-xl font-bold text-stone-900">Authentication Required</h2>
            <p className="text-xs text-stone-600">
              You must log in with an administrator account to view the Admin Access Portal.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="px-6 py-2.5 bg-[#830e0d] text-white rounded-xl text-xs font-bold hover:bg-[#6f0c0b] transition-colors"
            >
              Return to Login Gateway
            </button>
          </div>
        </div>
      );
    }

    if (user.role !== 'admin') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
          <div className="bg-white p-8 rounded-3xl border border-stone-200 max-w-md w-full text-center space-y-4 shadow-xl">
            <ShieldAlert className="w-12 h-12 text-rose-600 mx-auto" />
            <h2 className="text-xl font-bold text-stone-900">Access Denied</h2>
            <p className="text-xs text-stone-600">
              Your account does not have administrator privileges. Only users with role <code>admin</code> can access this portal.
            </p>
            <button
              onClick={() => navigateTo('/')}
              className="px-6 py-2.5 bg-stone-900 text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors"
            >
              Back to Gateway
            </button>
          </div>
        </div>
      );
    }

    return (
      <React.Suspense fallback={<RouteChunkLoading label="Loading admin portal…" />}>
        <AdminPortal onNavigateGateway={() => navigateTo('/')} />
      </React.Suspense>
    );
  }

  // Default Gateway
  return (
    <React.Suspense fallback={<RouteChunkLoading label="Loading gateway…" />}>
      <LoginGateway onNavigateAdmin={() => navigateTo('/admin/access')} />
    </React.Suspense>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
};

export default App;
