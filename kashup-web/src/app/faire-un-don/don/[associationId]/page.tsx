'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Header from '../../../../components/Header';
import Footer from '../../../../components/Footer';
import { useAuth } from '../../../../context/AuthContext';
import {
  meWallet,
  createDonation as apiCreateDonation,
} from '../../../../lib/authenticated-api';
import type { DonationCategoryWithAssociations } from '../../../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function DonationFormPage() {
  const params = useParams();
  const router = useRouter();
  const associationId = params?.associationId as string | undefined;
  const { user, getAccessToken, refreshToken } = useAuth();
  const [association, setAssociation] = useState<{
    id: string;
    name: string;
    description?: string;
    impact?: string;
    categoryTitle: string;
  } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [amount, setAmount] = useState<string>('10');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!associationId) {
      setLoading(false);
      return;
    }
    if (!user) {
      router.replace(`/connexion?redirect=${encodeURIComponent(`/faire-un-don/don/${associationId}`)}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [categoriesRes, walletRes] = await Promise.all([
          fetch(`${API_BASE}/donations/categories-with-associations`).then((r) => r.json()),
          meWallet(getAccessToken, refreshToken),
        ]);
        if (cancelled) return;
        const categories: DonationCategoryWithAssociations[] = Array.isArray(categoriesRes?.data)
          ? categoriesRes.data
          : categoriesRes?.data?.data ?? [];
        const found = categories.flatMap((c) =>
          c.associations.map((a) => ({ ...a, categoryTitle: c.title }))
        ).find((a) => a.id === associationId);
        if (found) {
          setAssociation({
            id: found.id,
            name: found.name,
            description: found.description,
            impact: found.impact,
            categoryTitle: found.categoryTitle,
          });
        }
        const solde = (walletRes as { soldeCashback?: number })?.soldeCashback ?? 0;
        setBalance(solde);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [associationId, user, getAccessToken, refreshToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associationId || !user) return;
    const num = Math.round(parseFloat(amount.replace(',', '.')) * 100) / 100;
    if (!Number.isFinite(num) || num <= 0) {
      setError('Montant invalide');
      return;
    }
    const maxBalance = balance ?? 0;
    if (num > maxBalance) {
      setError(`Solde insuffisant (max. ${maxBalance.toFixed(2)} €)`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiCreateDonation(associationId, num, getAccessToken, refreshToken);
      router.push('/faire-un-don?don=ok');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du don');
    } finally {
      setSubmitting(false);
    }
  };

  const balanceNum = balance ?? 0;
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;
  const validAmount = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= balanceNum;

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header />
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-lg">
          <Link
            href="/faire-un-don"
            className="text-sm font-medium text-slate-600 hover:text-[var(--primary)]"
          >
            ← Retour aux associations
          </Link>
          {loading && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              Chargement…
            </div>
          )}
          {!loading && !association && (
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-slate-600">Association introuvable.</p>
              <Link
                href="/faire-un-don"
                className="mt-4 inline-block text-[var(--primary)] font-semibold hover:underline"
              >
                Voir les associations
              </Link>
            </div>
          )}
          {!loading && association && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Association
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">{association.name}</h1>
                <p className="mt-0.5 text-sm text-slate-600">{association.categoryTitle}</p>
                {association.impact && (
                  <p className="mt-2 text-sm text-slate-600">{association.impact}</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <label htmlFor="don-amount" className="block text-sm font-semibold text-slate-700">
                  Montant du don (€)
                </label>
                <p className="mt-1 text-sm text-slate-500">
                  Solde cashback disponible : <strong>{balanceNum.toFixed(2)} €</strong>
                </p>
                <input
                  id="don-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-lg font-semibold focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
                  placeholder="0,00"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[5, 10, 20, 50].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmount(String(v))}
                      disabled={v > balanceNum}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50 hover:bg-slate-100"
                    >
                      {v} €
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !validAmount}
                  className="flex-1 rounded-xl bg-[var(--primary)] px-6 py-3.5 text-base font-semibold text-white shadow-md hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:hover:bg-[var(--primary)]"
                >
                  {submitting ? 'Envoi…' : 'Confirmer le don'}
                </button>
                <Link
                  href="/faire-un-don"
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Annuler
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
