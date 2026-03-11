import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { LoginForm } from '../components/login-form';
import { useAuthStore } from '@/store/auth-store';

export const LoginPage = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [hasHydrated, isAuthenticated, navigate]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null; // Éviter le rendu pendant la navigation
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-10 shadow-soft">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wide text-ink/40">Administration KashUP</p>
          <h1 className="text-2xl font-semibold text-ink">Connexion sécurisée</h1>
          <p className="text-sm text-ink/60">Role admin requis.</p>
        </div>
        <LoginForm />
        <Link
          to="/reset-password"
          className="mt-4 block text-center text-sm font-medium text-primary hover:text-primary-hover"
        >
          Mot de passe oublié ?
        </Link>
      </div>
    </div>
  );
};

