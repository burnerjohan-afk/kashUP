import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth-store';

export const ProtectedRoute = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const location = useLocation();

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" role="status" aria-label="Chargement" />
        <p className="text-sm text-ink/70">Chargement…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

