'use client';

import { Percent, Sparkles, Wallet, Star } from 'lucide-react';
import { AnimateOnScroll } from './AnimateOnScroll';

const CARDS = [
  { icon: Percent, title: 'Taux par partenaire', text: 'Chaque partenaire fixe son taux (ex. 5 %, 10 %). Plus vous achetez chez lui, plus vous cumulez.', color: 'bg-emerald-500/10 text-[var(--primary)]' },
  { icon: Sparkles, title: 'Bienvenue & permanent', text: 'Certains offrent un taux boosté au début, puis un taux permanent. Tout est indiqué dans l\'app.', color: 'bg-violet-500/10 text-violet-600' },
  { icon: Wallet, title: 'Crédit automatique', text: 'Achat détecté → cashback calculé et ajouté à votre cagnotte. Aucune démarche.', color: 'bg-slate-100 text-slate-700' },
  { icon: Star, title: 'Points en plus', text: 'Chez certains partenaires vous gagnez aussi des points (récompenses, bonus).', color: 'bg-amber-500/10 text-amber-700' },
];

export function PrincipeCashback() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <AnimateOnScroll>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
            <Percent className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Le cashback</h2>
        </div>
      </AnimateOnScroll>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card, i) => (
          <AnimateOnScroll key={i} variant="fadeUp" delay={i * 70}>
            <div className="flex flex-col rounded-xl border border-slate-100 p-5 transition hover:border-[var(--primary)]/20 hover:shadow-md">
              <div className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{card.text}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </section>
  );
}
