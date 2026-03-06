'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, isLoading } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/98 backdrop-blur-md shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:max-w-7xl">
        <Link
          href="/"
          className="text-xl font-bold tracking-tight text-[var(--primary)] transition hover:opacity-90 sm:text-2xl"
        >
          KashUP
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Accueil
          </Link>
          <Link
            href="/principe"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Principe
          </Link>
          <Link
            href="/partenaires"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Partenaires
          </Link>
          <Link
            href="/cartes-box"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Cartes & Box
          </Link>
          <Link
            href="/faire-un-don"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          >
            Fais un don
          </Link>
          {!isLoading && (user ? (
            <>
              {user.role === 'partner' && user.partnerId && (
                <Link
                  href="/espace-partenaire"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Espace partenaire
                </Link>
              )}
              <Link
                href="/mon-compte"
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
              >
                Mon compte
              </Link>
            </>
          ) : (
            <Link
              href="/connexion"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Se connecter
            </Link>
          ))}
          <a
            href="/#telecharger"
            className="btn-cta-animate ml-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-dark)] hover:shadow-lg"
          >
            Télécharger l’app
          </a>
        </nav>
      </div>
    </header>
  );
}
