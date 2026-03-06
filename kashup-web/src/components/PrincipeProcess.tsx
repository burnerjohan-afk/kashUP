'use client';

import { ShoppingBag, Wallet, Gift, ArrowRight } from 'lucide-react';
import { AnimateOnScroll } from './AnimateOnScroll';

const STEPS = [
  { num: 1, icon: ShoppingBag, title: 'Achetez chez les partenaires', short: 'Consommez comme d’habitude chez les commerces KashUP.', color: 'emerald' },
  { num: 2, icon: Wallet, title: 'Cumulez du cashback', short: 'Une part de vos achats revient sur votre cagnotte automatiquement.', color: 'violet' },
  { num: 3, icon: Gift, title: 'Utilisez votre cagnotte', short: 'Cartes cadeaux, box ou dons — vous choisissez.', color: 'amber' },
];

const colorMap: Record<string, string> = {
  emerald: 'bg-emerald-500/15 text-[var(--primary)]',
  violet: 'bg-violet-500/15 text-violet-600',
  amber: 'bg-amber-500/15 text-amber-700',
};

export function PrincipeProcess() {
  return (
    <section aria-labelledby="process-title">
      <h2 id="process-title" className="sr-only">Processus KashUP en 3 étapes</h2>
      <div className="relative">
        <div className="absolute left-1/2 top-24 hidden h-0.5 w-[calc(100%-14rem)] max-w-[32rem] -translate-x-1/2 bg-gradient-to-r from-[var(--primary)] via-violet-400 to-amber-400 sm:block" aria-hidden />
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <AnimateOnScroll key={step.num} variant="fadeUp" delay={i * 100}>
              <div className="relative flex flex-col items-center text-center">
                <div className={`flex h-20 w-20 items-center justify-center rounded-2xl ring-4 ring-white shadow-lg ${colorMap[step.color]}`}>
                  <step.icon className="h-9 w-9" aria-hidden />
                </div>
                <span className="mt-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">{step.num}</span>
                <h3 className="mt-3 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{step.short}</p>
                {i < STEPS.length - 1 && (
                  <div className="mt-4 flex sm:hidden" aria-hidden>
                    <ArrowRight className="h-5 w-5 text-slate-300" />
                  </div>
                )}
              </div>
            </AnimateOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
