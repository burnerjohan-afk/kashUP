'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Partner, PartnerCategory } from '../lib/api';
import { PartnerCard } from './PartnerCard';
import { Search, Filter, Sparkles, Zap, TrendingUp } from 'lucide-react';

const TERRITORIES = ['Martinique', 'Guadeloupe', 'Guyane'] as const;
const ALL_ID = 'all';

type Props = {
  partners: Partner[];
  categories: PartnerCategory[];
};

function hasProgram(p: Partner, program: string): boolean {
  const programs = p.marketingPrograms;
  if (!programs || !Array.isArray(programs)) return false;
  return programs.includes(program);
}

export function PartnersPageContent({ partners, categories }: Props) {
  const [categoryId, setCategoryId] = useState<string>(ALL_ID);
  const [territory, setTerritory] = useState<string>(ALL_ID);
  const [search, setSearch] = useState('');

  const filteredPartners = useMemo(() => {
    const q = search.trim().toLowerCase();
    return partners.filter((p) => {
      if (categoryId !== ALL_ID) {
        const catId = p.category?.id ?? p.categoryId;
        if (catId !== categoryId) return false;
      }
      if (territory !== ALL_ID) {
        const territories = p.territories ?? [];
        if (!territories.length || !territories.some((t) => t === territory)) return false;
      }
      if (q) {
        const name = (p.name ?? '').toLowerCase();
        const desc = (p.shortDescription ?? '').toLowerCase();
        const cat = (p.category?.name ?? '').toLowerCase();
        if (!name.includes(q) && !desc.includes(q) && !cat.includes(q)) return false;
      }
      return true;
    });
  }, [partners, categoryId, territory, search]);

  const pepites = useMemo(
    () => filteredPartners.filter((p) => hasProgram(p, 'pepites')),
    [filteredPartners]
  );
  const boosted = useMemo(
    () => filteredPartners.filter((p) => hasProgram(p, 'boosted')),
    [filteredPartners]
  );
  const mostSearched = useMemo(
    () => filteredPartners.filter((p) => hasProgram(p, 'most-searched')),
    [filteredPartners]
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:max-w-7xl">
      {/* Filtres */}
      <div className="mb-10 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filtrer</span>
          </div>
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Rechercher un partenaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              aria-label="Rechercher un partenaire"
            />
          </div>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-900 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            aria-label="Catégorie"
          >
            <option value={ALL_ID}>Toutes les catégories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={territory}
            onChange={(e) => setTerritory(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10 text-sm text-slate-900 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            aria-label="Territoire"
          >
            <option value={ALL_ID}>Tous les territoires</option>
            {TERRITORIES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Section Pépites KashUP */}
      {pepites.length > 0 && (
        <section className="mb-14">
          <h2 className="heading-section mb-2 flex items-center gap-2 text-slate-900">
            <Sparkles className="h-6 w-6 text-[var(--accent-amber)]" />
            Les pépites KashUP
          </h2>
          <p className="mb-6 max-w-2xl text-slate-600">
            Nos partenaires coups de cœur, sélectionnés pour vous.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pepites.map((p) => (
              <li key={p.id}>
                <Link href={`/partenaires/${p.id}`} className="block transition hover:opacity-95">
                  <PartnerCard partner={p} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section Partenaires boostés */}
      {boosted.length > 0 && (
        <section className="mb-14">
          <h2 className="heading-section mb-2 flex items-center gap-2 text-slate-900">
            <Zap className="h-6 w-6 text-[var(--primary)]" />
            Partenaires boostés
          </h2>
          <p className="mb-6 max-w-2xl text-slate-600">
            Offres renforcées du moment : cashback ou points en plus.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {boosted.map((p) => (
              <li key={p.id}>
                <Link href={`/partenaires/${p.id}`} className="block transition hover:opacity-95">
                  <PartnerCard partner={p} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Section Partenaires les plus recherchés */}
      {mostSearched.length > 0 && (
        <section className="mb-14">
          <h2 className="heading-section mb-2 flex items-center gap-2 text-slate-900">
            <TrendingUp className="h-6 w-6 text-[var(--accent-violet)]" />
            Partenaires les plus recherchés
          </h2>
          <p className="mb-6 max-w-2xl text-slate-600">
            Les partenaires préférés des utilisateurs KashUP.
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mostSearched.map((p) => (
              <li key={p.id}>
                <Link href={`/partenaires/${p.id}`} className="block transition hover:opacity-95">
                  <PartnerCard partner={p} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Tous les partenaires */}
      <section>
        <h2 className="heading-section text-slate-900">Tous les partenaires</h2>
        <p className="mt-2 mb-6 max-w-2xl text-slate-600">
          {filteredPartners.length === 0
            ? 'Aucun partenaire ne correspond à vos filtres.'
            : `${filteredPartners.length} partenaire${filteredPartners.length !== 1 ? 's' : ''} avec KashUP.`}
        </p>
        {filteredPartners.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPartners.map((p) => (
              <li key={p.id}>
                <Link href={`/partenaires/${p.id}`} className="block transition hover:opacity-95">
                  <PartnerCard partner={p} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-slate-500">
            Modifiez les filtres pour afficher des résultats.
          </p>
        )}
      </section>
    </div>
  );
}
