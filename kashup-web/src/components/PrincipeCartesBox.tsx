'use client';

import { Ticket, Package } from 'lucide-react';
import { AnimateOnScroll } from './AnimateOnScroll';

const CARTES_STEPS = [
  'Choisissez partenaire et montant dans l’app',
  'Le montant est débité de votre cagnotte',
  'Vous recevez un bon ou code à utiliser en magasin ou en ligne',
];
const CARTES_EXTRA = 'Vous pouvez offrir une Carte UP à un ou une amie.';

const BOX_STEPS = [
  'Choisissez une box (plusieurs partenaires / avantages)',
  'Prix débité de votre cagnotte',
  'Vous profitez des avantages chez les partenaires inclus',
];
const BOX_EXTRA = 'Vous pouvez offrir une Box UP à un ou une amie.';

export function PrincipeCartesBox() {
  return (
    <section className="grid gap-8 lg:grid-cols-2">
      {/* Cartes */}
      <AnimateOnScroll variant="fadeUp">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
              <Ticket className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Les cartes cadeaux (Cartes UP)
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Utilisez votre cagnotte pour acheter des bons d’achat chez les partenaires.
          </p>
          <ul className="mt-5 space-y-3">
            {CARTES_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/15 text-xs font-bold text-[var(--primary)]">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-[var(--primary)]">
            {CARTES_EXTRA}
          </p>
        </div>
      </AnimateOnScroll>

      {/* Box */}
      <AnimateOnScroll variant="fadeUp" delay={100}>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
              <Package className="h-6 w-6 text-violet-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Les box (Box UP)
            </h2>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Offres groupées : plusieurs partenaires ou avantages dans une box à prix fixe.
          </p>
          <ul className="mt-5 space-y-3">
            {BOX_STEPS.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-600">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700">
            {BOX_EXTRA}
          </p>
        </div>
      </AnimateOnScroll>
    </section>
  );
}
