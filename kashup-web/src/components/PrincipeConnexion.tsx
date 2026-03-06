'use client';

import { CreditCard, Scan, CheckCircle, Shield, Lock, FileCheck } from 'lucide-react';
import { AnimateOnScroll } from './AnimateOnScroll';

const FLOW = [
  { icon: CreditCard, label: 'Vous liez votre carte', sub: 'Une fois, via Powens' },
  { icon: Scan, label: 'On détecte vos achats', sub: 'Chez les partenaires KashUP' },
  { icon: CheckCircle, label: 'Rien à déclarer', sub: 'Le cashback est crédité auto' },
];

const BADGES = [
  { icon: Lock, label: 'Chiffrement', short: 'Données protégées' },
  { icon: Shield, label: 'Powens agréé ACPR', short: 'Cadre DSP2 européen' },
  { icon: FileCheck, label: 'RGPD', short: 'Vous gardez le contrôle' },
];

export function PrincipeConnexion() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <AnimateOnScroll>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
            <CreditCard className="h-6 w-6 text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Connexion bancaire</h2>
            <p className="text-sm text-slate-500">Via notre partenaire Powens</p>
          </div>
        </div>
      </AnimateOnScroll>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {FLOW.map((item, i) => (
          <AnimateOnScroll key={i} variant="fadeUp" delay={i * 80}>
            <div className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/50 p-5 text-center transition hover:border-[var(--primary)]/20 hover:bg-emerald-50/30">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[var(--primary)] shadow-sm">
                <item.icon className="h-6 w-6" aria-hidden />
              </div>
              <p className="mt-3 font-semibold text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.sub}</p>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        {BADGES.map((b, i) => (
          <AnimateOnScroll key={i} variant="scale" delay={200 + i * 60}>
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
              <b.icon className="h-5 w-5 text-[var(--primary)]" aria-hidden />
              <div>
                <p className="text-sm font-semibold text-slate-900">{b.label}</p>
                <p className="text-xs text-slate-500">{b.short}</p>
              </div>
            </div>
          </AnimateOnScroll>
        ))}
      </div>
    </section>
  );
}
