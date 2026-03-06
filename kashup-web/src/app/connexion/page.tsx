'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Wallet } from 'lucide-react';

export default function ConnexionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/mon-compte';
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password, rememberMe);
      router.push(redirectTo.startsWith('/') ? redirectTo : '/mon-compte');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:max-w-7xl">
          <Link href="/" className="text-xl font-bold tracking-tight text-[var(--primary)]">
            KashUP
          </Link>
          <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-lg">
            <div className="mb-8 flex items-center justify-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/10">
                <Wallet className="h-6 w-6 text-[var(--primary)]" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Connexion</h1>
            </div>
            <p className="mb-6 text-center text-sm text-slate-600">
              Connectez-vous avec le même compte que sur l&apos;app KashUP pour retrouver votre cagnotte, vos points et vos bons d&apos;achat.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="vous@exemple.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="••••••••"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                <span className="text-sm text-slate-600">Rester connecté</span>
              </label>
              <button
                type="submit"
                disabled={submitting || isLoading}
                className="w-full rounded-xl bg-[var(--primary)] px-4 py-3 font-semibold text-white shadow-md transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
              >
                {submitting ? 'Connexion…' : 'Se connecter'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Vous n&apos;avez pas de compte ? Inscrivez-vous via l&apos;app KashUP, puis connectez-vous ici.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
