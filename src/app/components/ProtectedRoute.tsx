import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, Outlet } from 'react-router';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

export function ProtectedRoute() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const syncedRef = useRef(false);

  // Sync signed-in user to backend app_users table (insert/update by clerk_user_id)
  useEffect(() => {
    if (!isLoaded || !isSignedIn || syncedRef.current) return;
    syncedRef.current = true;
    getToken()
      .then((token) => {
        if (!token) return;
        return fetch(`${API_BASE}/api/init-user`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
      })
      .catch((err) => console.warn('init-user sync failed:', err));
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
