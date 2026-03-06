'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { mePartner, mePartnerStats, type PartnerDashboardStats } from '../../lib/authenticated-api';
import {
  BarChart3,
  Users,
  Euro,
  ShoppingCart,
  ArrowRight,
  TrendingUp,
  User,
  Calendar,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const GENDER_COLORS = { M: '#0ea5e9', F: '#ec4899', other: '#94a3b8' };
const GENDER_LABELS_CHART = { M: 'Hommes', F: 'Femmes', other: 'Autre' };

type PartnerInfo = { id: string; name: string; logoUrl?: string | null; category?: { id: string; name: string } };

export default function EspacePartenairePage() {
  const { user, getAccessToken, refreshToken } = useAuth();
  const [partner, setPartner] = useState<PartnerInfo | null>(null);
  const [stats, setStats] = useState<PartnerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [groupBy, setGroupBy] = useState<'day' | 'month'>('month');

  const getToken = useCallback(() => Promise.resolve(getAccessToken()), [getAccessToken]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [partnerRes, statsRes] = await Promise.all([
          mePartner(getToken, refreshToken),
          mePartnerStats({ groupBy }, getToken, refreshToken),
        ]);
        if (cancelled) return;
        setPartner(partnerRes);
        setStats(statsRes);
      } catch (e: unknown) {
        if (cancelled) return;
        const err = e as { message?: string };
        if (err?.message?.includes('403') || (e as Response)?.status === 403) {
          setForbidden(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, getToken, refreshToken, groupBy]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-slate-500">
        Chargement du tableau de bord…
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Espace partenaire</h1>
          <p className="mt-3 text-slate-600">
            Cet espace est réservé aux comptes partenaires. Votre compte n&apos;est pas lié à un partenaire.
          </p>
          <Link
            href="/mon-compte"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            Retour à mon compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (!partner || !stats) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center text-slate-500">
        Aucune donnée partenaire.
      </div>
    );
  }

  const s = stats.summary;
  const genderLabels = { M: 'Hommes', F: 'Femmes', other: 'Autre' };
  const ageOrder = ['18-25', '26-35', '36-50', '50+', 'non_renseigne'];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {partner.logoUrl ? (
            <img
              src={partner.logoUrl.startsWith('http') ? partner.logoUrl : `${process.env.NEXT_PUBLIC_API_URL || ''}${partner.logoUrl}`}
              alt=""
              className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-200"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-xl font-bold text-[var(--primary)]">
              {partner.name.slice(0, 1)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{partner.name}</h1>
            {partner.category && (
              <p className="text-sm text-slate-500">{partner.category.name}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGroupBy('day')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${groupBy === 'day' ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Par jour
          </button>
          <button
            type="button"
            onClick={() => setGroupBy('month')}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${groupBy === 'month' ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Par mois
          </button>
        </div>
      </div>

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
          Impact KashUP sur votre activité
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-5 w-5" />
              <span className="text-sm font-medium">Utilisateurs uniques</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.uniqueUsers}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <ShoppingCart className="h-5 w-5" />
              <span className="text-sm font-medium">Transactions</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.totalTransactions}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <Euro className="h-5 w-5" />
              <span className="text-sm font-medium">CA généré (€)</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-[var(--primary)]">{s.totalRevenue.toFixed(2)} €</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <BarChart3 className="h-5 w-5" />
              <span className="text-sm font-medium">Panier moyen (€)</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{s.averageBasket.toFixed(2)} €</p>
          </div>
        </div>
      </section>

      {stats.series.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Calendar className="h-5 w-5 text-[var(--primary)]" />
            CA et volume {groupBy === 'day' ? 'par jour' : 'par mois'}
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-700">Période</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Transactions</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Utilisateurs uniques</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">CA (€)</th>
                </tr>
              </thead>
              <tbody>
                {stats.series.map((row) => (
                  <tr key={row.period} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.period}</td>
                    <td className="px-4 py-3 text-slate-600">{row.transactionCount}</td>
                    <td className="px-4 py-3 text-slate-600">{row.uniqueUsers}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--primary)]">{row.revenue.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {stats.byDayOfWeek && stats.byDayOfWeek.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Calendar className="h-5 w-5 text-[var(--primary)]" />
            Transactions par jour de la semaine (par genre)
          </h2>
          <div className="h-80 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...stats.byDayOfWeek].sort((a, b) => (a.day === 0 ? 7 : a.day) - (b.day === 0 ? 7 : b.day))} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value, 'Transactions']} labelFormatter={(label) => label} />
                <Legend formatter={(value) => GENDER_LABELS_CHART[value as keyof typeof GENDER_LABELS_CHART] ?? value} />
                <Bar dataKey="M" stackId="a" fill={GENDER_COLORS.M} name="M" />
                <Bar dataKey="F" stackId="a" fill={GENDER_COLORS.F} name="F" />
                <Bar dataKey="other" stackId="a" fill={GENDER_COLORS.other} name="other" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {stats.byHour && stats.byHour.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <Clock className="h-5 w-5 text-[var(--primary)]" />
            Transactions par heure (par genre)
          </h2>
          <div className="h-80 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.byHour} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} tickFormatter={(h) => `${h}h`} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [value, 'Transactions']} labelFormatter={(h) => `${h}h - ${Number(h) + 1}h`} />
                <Legend formatter={(value) => GENDER_LABELS_CHART[value as keyof typeof GENDER_LABELS_CHART] ?? value} />
                <Bar dataKey="M" stackId="b" fill={GENDER_COLORS.M} name="M" />
                <Bar dataKey="F" stackId="b" fill={GENDER_COLORS.F} name="F" />
                <Bar dataKey="other" stackId="b" fill={GENDER_COLORS.other} name="other" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {stats.topSlotsByGender && stats.topSlotsByGender.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
            <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
            Top créneaux : quel jour et quelle heure, quel genre vient le plus
          </h2>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full min-w-[400px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-4 py-3 font-semibold text-slate-700">Jour</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Heure</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Genre</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">Transactions</th>
                  <th className="px-4 py-3 font-semibold text-slate-700">CA (€)</th>
                </tr>
              </thead>
              <tbody>
                {stats.topSlotsByGender.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.dayLabel}</td>
                    <td className="px-4 py-3 text-slate-600">{row.hour}h - {row.hour + 1}h</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GENDER_COLORS[row.gender as keyof typeof GENDER_COLORS] ?? GENDER_COLORS.other }} />
                        {genderLabels[row.gender as keyof typeof genderLabels] ?? row.gender}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{row.transactionCount}</td>
                    <td className="px-4 py-3 text-[var(--primary)] font-medium">{row.revenue.toFixed(2)} €</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <User className="h-5 w-5 text-[var(--primary)]" />
          Répartition par genre
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(stats.byGender) as Array<keyof typeof stats.byGender>).map((g) => {
            const v = stats.byGender[g];
            return (
              <div key={g} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-600">{genderLabels[g] ?? g}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{v.uniqueUsers} utilisateurs</p>
                <p className="text-sm text-slate-500">{v.transactionCount} transactions · {v.revenue.toFixed(2)} €</p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-900">
          <BarChart3 className="h-5 w-5 text-[var(--primary)]" />
          Répartition par tranche d&apos;âge
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ageOrder.filter((ar) => stats.byAgeRange[ar]).map((ar) => {
            const v = stats.byAgeRange[ar];
            const label = ar === 'non_renseigne' ? 'Non renseigné' : ar;
            return (
              <div key={ar} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-600">{label}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{v.uniqueUsers} utilisateurs</p>
                <p className="text-sm text-slate-500">{v.transactionCount} transactions · {v.revenue.toFixed(2)} €</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
