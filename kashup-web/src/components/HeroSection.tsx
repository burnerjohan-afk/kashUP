'use client';

import { StoreBadges } from './StoreBadges';
import { Star } from 'lucide-react';

type Props = { maxCashback: number; partnersCount: number };

export function HeroSection({ maxCashback, partnersCount }: Props) {
  const cashbackLabel = maxCashback > 0 ? `Jusqu'à ${maxCashback} % de cashback` : 'Du cashback chez vos commerces';
  const partnersLabel = partnersCount > 0 ? `${partnersCount} partenaires` : 'Des partenaires locaux';

  return (
    <section
      className="relative overflow-hidden"
      aria-label="Présentation KashUP"
    >
      {/* Couche de fond avec gradient animé */}
      <div
        className="hero-gradient-animated absolute inset-0"
        aria-hidden
      />
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(4, 120, 87, 0.25), transparent)',
        }}
        aria-hidden
      />
      {/* Orbe flottante décorative */}
      <div
        className="absolute right-[10%] top-[20%] h-64 w-64 rounded-full opacity-20 blur-3xl animate-float"
        style={{ backgroundColor: 'var(--primary)' }}
        aria-hidden
      />
      <div
        className="absolute bottom-[30%] left-[5%] h-40 w-40 rounded-full bg-violet-500/10 blur-3xl animate-float"
        style={{ animationDelay: '1s' }}
        aria-hidden
      />

      <div className="relative px-4 pt-14 pb-28 sm:px-6 sm:pt-20 sm:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="heading-hero text-white">
            Gagnez du cashback
            <br />
            <span className="bg-gradient-to-r from-[#059669] to-[var(--primary)] bg-clip-text text-transparent">
              chez vos commerces
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/85 sm:text-xl">
            KashUP vous aide à récupérer une part de vos achats chez les partenaires locaux. Cashback, points, cartes cadeaux et dons. Simple, sécurisé, pensé pour la Caraïbe.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {maxCashback > 0 && (
              <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                {cashbackLabel}
              </span>
            )}
            {partnersCount > 0 && (
              <span className="rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                {partnersLabel}
              </span>
            )}
          </div>

          <div className="mt-12">
            <StoreBadges />
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
              <span className="font-medium text-white/90">4,5/5</span>
            </span>
            <span>sur l’App Store</span>
            <span className="text-white/50">·</span>
            <span>Gratuit · iOS et Android</span>
          </p>
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 h-14 sm:h-20"
        style={{
          background: 'var(--background)',
          clipPath: 'ellipse(130% 100% at 50% 100%)',
        }}
        aria-hidden
      />
    </section>
  );
}
