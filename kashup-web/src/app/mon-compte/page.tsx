'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import {
  meWallet,
  meWalletHistory,
  meRewards,
  meGiftCards,
  meCoffreFortHistory,
  type WalletSummary,
  type WalletTransaction,
  type RewardsSummary,
  type GiftCardPurchase,
  type CoffreFortHistory,
} from '../../lib/authenticated-api';
import {
  Wallet,
  Star,
  Lock,
  Heart,
  Gift,
  Leaf,
  Zap,
  LogOut,
  Receipt,
  Tag,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Store,
  PiggyBank,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const formatPoints = (value: number) => `${value.toLocaleString('fr-FR')} pts`;
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const formatCashback = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)} €`;

function computeImpact(transactions: WalletTransaction[]) {
  const now = new Date();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.transactionDate);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthlyInjected = monthTx.reduce((s, t) => s + t.amount, 0);
  const totalAmount = transactions.reduce((s, t) => s + t.amount, 0);
  const totalCashback = transactions.reduce((s, t) => s + t.cashbackEarned, 0);
  const merchantsHelped = new Set(transactions.map((t) => t.partner?.id).filter(Boolean)).size;
  const boostRate = totalAmount > 0 ? (totalCashback / totalAmount) * 100 : 0;
  const target = monthlyInjected > 0 ? monthlyInjected * 1.2 : 500;
  const progress = target > 0 ? Math.min(100, (monthlyInjected / target) * 100) : 0;
  return {
    monthlyInjected,
    target,
    merchantsHelped,
    purchasesCount: transactions.length,
    boostRate,
    progress,
  };
}

function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-200 text-lg font-bold text-slate-700 sm:h-16 sm:w-16 sm:text-xl">
      {initials || '?'}
    </div>
  );
}

export default function MonComptePage() {
  const { user, logout, getAccessToken, refreshToken } = useAuth();
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [history, setHistory] = useState<WalletTransaction[]>([]);
  const [rewards, setRewards] = useState<RewardsSummary | null>(null);
  const [giftCards, setGiftCards] = useState<GiftCardPurchase[]>([]);
  const [coffreFortHistory, setCoffreFortHistory] = useState<CoffreFortHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, h, r, g, cf] = await Promise.all([
        meWallet(getAccessToken, refreshToken).catch(() => null),
        meWalletHistory(getAccessToken, refreshToken).catch(() => []),
        meRewards(getAccessToken, refreshToken).catch(() => null),
        meGiftCards(getAccessToken, refreshToken).catch(() => []),
        meCoffreFortHistory(getAccessToken, refreshToken).catch(() => null),
      ]);
      setWallet(w ?? null);
      setHistory(Array.isArray(h) ? h : []);
      setRewards(r ?? null);
      setGiftCards(Array.isArray(g) ? g : []);
      setCoffreFortHistory(cf ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken, refreshToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const impact = useMemo(() => computeImpact(history), [history]);
  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.email ?? 'Mon compte';

  // Valeurs cagnotte avec repli (API peut renvoyer nombre ou objet imbriqué)
  const soldeCashback =
    wallet != null && typeof (wallet as { soldeCashback?: number }).soldeCashback === 'number'
      ? (wallet as { soldeCashback: number }).soldeCashback
      : 0;
  const soldePoints =
    wallet != null && typeof (wallet as { soldePoints?: number }).soldePoints === 'number'
      ? Number((wallet as { soldePoints: number }).soldePoints)
      : 0;
  const soldeCoffreFort =
    wallet != null && typeof (wallet as { soldeCoffreFort?: number }).soldeCoffreFort === 'number'
      ? (wallet as { soldeCoffreFort: number }).soldeCoffreFort
      : 0;
  const walletAny = wallet as { coffreFortConfig?: { lockPeriodMonths?: number; pointsPerEuroPerMonth?: number }; withdrawableCoffreFort?: number } | null;
  const coffreFortConfig = walletAny?.coffreFortConfig;
  const withdrawableCoffreFort = typeof walletAny?.withdrawableCoffreFort === 'number' ? walletAny.withdrawableCoffreFort : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* En-tête neutre (évite le vert sur vert) */}
      <header className="border-b border-slate-200 bg-white px-4 py-5 shadow-sm sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar name={displayName} />
            <div>
              <p className="text-sm font-medium text-slate-500">Bienvenue</p>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{displayName}</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 shadow-sm">
            {error}
            <button type="button" onClick={fetchAll} className="ml-2 font-semibold underline">
              Réessayer
            </button>
          </div>
        )}

        {/* Carte Ma Cagnotte — toujours visible avec cashback et points */}
        <section id="cagnotte" className="mb-8 scroll-mt-6" aria-label="Ma cagnotte KashUP">
          <div className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-dark)] p-6 shadow-xl ring-2 ring-black/5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-white/25 p-2">
                    <Wallet className="h-5 w-5 text-white" aria-hidden />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/95">
                    Ma Cagnotte
                  </span>
                </div>
                {loading ? (
                  <p className="mt-4 text-2xl font-bold text-white">Chargement…</p>
                ) : (
                  <>
                    <p className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl" id="solde-cashback">
                      {formatCurrency(soldeCashback)}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/90">
                      Montant disponible grâce à vos achats chez les partenaires KashUP.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2.5 backdrop-blur">
                        <div className="h-2.5 w-2.5 rounded-full bg-amber-300" aria-hidden />
                        <span className="text-sm font-semibold text-white">Points</span>
                        <span className="text-sm font-bold text-amber-200" id="solde-points">
                          {formatPoints(soldePoints)}
                        </span>
                      </div>
                      {soldeCoffreFort > 0 && (
                        <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2.5 backdrop-blur">
                          <Lock className="h-4 w-4 text-white/95" aria-hidden />
                          <span className="text-sm font-medium text-white/95">
                            Coffre-fort {formatCurrency(soldeCoffreFort)}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <Sparkles className="hidden h-12 w-12 text-white/25 sm:block" aria-hidden />
            </div>
            <div className="mt-6 flex flex-wrap gap-3 border-t border-white/15 pt-6">
              <Link
                href="/faire-un-don"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                <Heart className="h-4 w-4" />
                Faire un don
              </Link>
              <Link
                href="/cartes-box"
                className="inline-flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/30"
              >
                <Gift className="h-4 w-4" />
                Bons d&apos;achat
              </Link>
            </div>
          </div>
        </section>

        {/* Coffre-fort : règles, montant retirable, historique */}
        <section id="coffre-fort" className="mb-10 scroll-mt-6" aria-label="Coffre-fort">
          <h2 className="heading-section mb-5 flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-700/10">
              <Lock className="h-5 w-5 text-slate-700" />
            </span>
            Coffre-fort
          </h2>
          <div className="card-premium overflow-hidden p-6 sm:p-8">
            <p className="text-sm text-slate-600">
              Mettez de côté une partie de votre cagnotte pour la bloquer et gagner des points. Les montants débloqués peuvent être retirés vers votre cagnotte.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-medium text-slate-500">Solde coffre-fort</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(soldeCoffreFort)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-medium text-slate-500">Retirable maintenant</p>
                <p className="mt-1 text-xl font-bold text-[var(--primary)]">{formatCurrency(withdrawableCoffreFort)}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-medium text-slate-500">Règles</p>
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {coffreFortConfig ? (
                    <>
                      Blocage {coffreFortConfig.lockPeriodMonths} mois · {coffreFortConfig.pointsPerEuroPerMonth} pts / € / mois
                    </>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </div>
            {/* Historique coffre-fort */}
            {coffreFortHistory && (
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
                  <PiggyBank className="h-4 w-4 text-slate-600" />
                  Historique
                </h3>
                <div className="grid gap-6 sm:grid-cols-3">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                      Versements
                    </p>
                    {!coffreFortHistory.versements?.length ? (
                      <p className="text-sm text-slate-400">Aucun versement</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {coffreFortHistory.versements.slice(0, 5).map((v, i) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span className="text-slate-600">{formatDate(v.date)}</span>
                            <span className="font-medium text-[var(--primary)]">+{formatCurrency(v.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <ArrowUpFromLine className="h-3.5 w-3.5" />
                      Retraits
                    </p>
                    {!coffreFortHistory.retraits?.length ? (
                      <p className="text-sm text-slate-400">Aucun retrait</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {coffreFortHistory.retraits.slice(0, 5).map((v, i) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span className="text-slate-600">{formatDate(v.date)}</span>
                            <span className="font-medium text-slate-700">−{formatCurrency(v.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <Star className="h-3.5 w-3.5" />
                      Points gagnés
                    </p>
                    {!coffreFortHistory.points?.length ? (
                      <p className="text-sm text-slate-400">Aucun point</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {coffreFortHistory.points.slice(0, 5).map((v, i) => (
                          <li key={i} className="flex justify-between text-sm">
                            <span className="text-slate-600">{formatDate(v.date)}</span>
                            <span className="font-medium text-amber-600">+{v.points} pts</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500">
              Verser ou retirer depuis l&apos;app KashUP.
            </p>
          </div>
        </section>

        {/* Ton impact local */}
        <section id="impact" className="mb-10 scroll-mt-6">
          <h2 className="heading-section mb-5 flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <Leaf className="h-5 w-5 text-[var(--primary)]" />
            </span>
            Ton impact local
          </h2>
          <div className="card-premium overflow-hidden p-6 sm:p-8">
            <p className="font-semibold text-slate-900">Économie locale renforcée</p>
            <p className="mt-1 text-sm text-slate-600">
              À force d&apos;achats locaux, vous créez un cercle vertueux sur votre territoire.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                {
                  label: 'Injecté ce mois',
                  value: formatCurrency(impact.monthlyInjected),
                  icon: TrendingUp,
                  accent: true,
                },
                {
                  label: 'Objectif KashUP',
                  value: formatCurrency(impact.target),
                  icon: Zap,
                  accent: false,
                },
                {
                  label: 'Commerces aidés',
                  value: String(impact.merchantsHelped),
                  icon: Store,
                  accent: false,
                },
                {
                  label: 'Achats locaux',
                  value: String(impact.purchasesCount),
                  icon: Receipt,
                  accent: false,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 transition hover:border-[var(--primary)]/20 hover:bg-slate-50"
                >
                  <item.icon className="h-5 w-5 text-slate-400" />
                  <p className="mt-2 text-xs font-medium text-slate-500">{item.label}</p>
                  <p
                    className={`mt-0.5 text-lg font-bold ${item.accent ? 'text-[var(--primary)]' : 'text-slate-900'}`}
                  >
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-600">Progression du mois</span>
                <span className="font-bold text-[var(--primary)]">{Math.round(impact.progress)} %</span>
              </div>
              <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] transition-all duration-500"
                  style={{ width: `${Math.round(impact.progress)}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Historique des gains */}
        <section id="historique" className="mb-10 scroll-mt-6">
          <h2 className="heading-section mb-5 flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <Receipt className="h-5 w-5 text-[var(--primary)]" />
            </span>
            Historique de vos gains
          </h2>
          <div className="card-premium overflow-hidden">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <Receipt className="h-10 w-10 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-700">Aucune transaction pour le moment</p>
                <p className="mt-1 text-sm text-slate-500">
                  Passez par KashUP chez nos partenaires pour voir apparaître vos gains ici.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {history.slice(0, 15).map((tx) => (
                  <li
                    key={tx.id}
                    className="flex items-center gap-4 px-6 py-4 transition hover:bg-slate-50/80"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-sm font-bold text-slate-500">
                      {tx.partner?.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={tx.partner.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (tx.partner?.name ?? 'P').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">
                        {tx.partner?.name ?? 'Partenaire KashUP'}
                      </p>
                      <p className="text-sm text-slate-500">{formatDate(tx.transactionDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-[var(--primary)]">
                        {formatCashback(tx.cashbackEarned)}
                      </p>
                      {tx.pointsEarned > 0 && (
                        <p className="text-xs font-medium text-slate-500">{tx.pointsEarned} pts</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Points & Récompenses */}
        <section id="points" className="mb-10 scroll-mt-6">
          <h2 className="heading-section mb-5 flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Star className="h-5 w-5 text-[var(--accent-amber)]" />
            </span>
            Points & Récompenses
          </h2>
          <div className="card-premium border-l-4 border-l-[var(--accent-amber)] p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Solde points</p>
                <p className="mt-1 text-3xl font-extrabold text-[var(--accent-amber)]">
                  {rewards ? formatPoints(rewards.points) : '0 pts'}
                </p>
              </div>
              {rewards?.rewards && rewards.rewards.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {rewards.rewards.slice(0, 5).map((r) => (
                    <span
                      key={r.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-800"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      {r.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  Aucun boost actif. Utilisez vos points dans l&apos;app !
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Bons d'achat */}
        <section id="bons" className="mb-10 scroll-mt-6">
          <h2 className="heading-section mb-5 flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
              <Gift className="h-5 w-5 text-[var(--accent-violet)]" />
            </span>
            Bons d&apos;achat (Cartes UP)
          </h2>
          <div className="card-premium overflow-hidden">
            {giftCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="rounded-2xl bg-slate-100 p-4">
                  <Gift className="h-10 w-10 text-slate-400" />
                </div>
                <p className="mt-4 font-medium text-slate-700">Aucune carte UP</p>
                <p className="mt-1 text-sm text-slate-500">
                  Achetez des cartes cadeaux dans l&apos;app ou découvrez les offres sur le site.
                </p>
                <Link
                  href="/cartes-box"
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
                >
                  Voir les offres
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="grid gap-0 sm:grid-cols-2">
                {giftCards.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-4 border-b border-slate-100 p-5 transition hover:bg-slate-50/80 last:border-b-0 sm:border-b-0 sm:border-r sm:even:border-r-0"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                      {p.giftCard?.partner?.logoUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.giftCard.partner.logoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Tag className="h-7 w-7 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{p.giftCard?.name ?? 'Carte UP'}</p>
                      <p className="text-sm text-slate-500">
                        {p.giftCard?.partner?.name ?? ''}
                        {p.giftCard?.value != null ? ` · ${formatCurrency(p.giftCard.value)}` : ''}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Partenaires favoris */}
        <section id="favoris" className="mb-10 scroll-mt-6">
          <h2 className="heading-section mb-5 flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
              <Heart className="h-5 w-5 text-rose-500" />
            </span>
            Partenaires favoris
          </h2>
          <div className="card-premium overflow-hidden border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 text-center">
            <Heart className="mx-auto h-12 w-12 text-rose-300" />
            <p className="mt-4 font-medium text-slate-700">
              Gérez vos favoris dans l&apos;app KashUP
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez des partenaires en favoris pour les retrouver plus vite sur votre téléphone.
            </p>
            <Link
              href="/partenaires"
              className="btn-cta-animate mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-dark)] hover:shadow-lg"
            >
              Voir tous les partenaires
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-500">
            Pour verser en coffre-fort, retirer ou utiliser vos bons, ouvrez l&apos;app KashUP.
          </p>
        </footer>
      </div>
    </div>
  );
}
