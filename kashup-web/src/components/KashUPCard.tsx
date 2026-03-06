'use client';

import { Wallet, Sparkles } from 'lucide-react';

type Props = { maxCashback?: number };

/** Proportion carte bancaire ISO/IEC 7810 (85.6 × 53.98 mm) ≈ 1.586 */
const CARD_ASPECT_RATIO = 1.586;

export function KashUPCard({ maxCashback = 0 }: Props) {
  const cashbackLabel = maxCashback > 0 ? `Jusqu'à ${maxCashback} %` : 'Du cashback';
  return (
    <div className="relative w-full max-w-[380px] mx-auto pb-8 pt-2">
      {/* Ombre portée sous la carte (couche dédiée) */}
      <div
        className="absolute left-1/2 top-0 w-full max-w-[380px] rounded-[20px] bg-black/25"
        style={{
          aspectRatio: String(CARD_ASPECT_RATIO),
          filter: 'blur(24px)',
          transform: 'translate(-50%, 20px)',
        }}
        aria-hidden
      />
      <div
        className="relative z-10 w-full overflow-hidden rounded-[20px] transition-transform duration-300 hover:scale-[1.02]"
        style={{
          aspectRatio: String(CARD_ASPECT_RATIO),
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
      >
      {/* Fond type carte bancaire : dégradé vert profond + vagues concentriques */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#034d35] via-[#047857] to-[#065f46]" aria-hidden />
      {/* Motif vagues concentriques (inspiration B for Bank / Sumeria) */}
      <svg
        className="absolute inset-0 w-full h-full opacity-50"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden
      >
        <defs>
          <radialGradient id="cardGlow" cx="50" cy="30" r="50">
            <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <linearGradient id="waveStroke" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
            <stop offset="50%" stopColor="rgba(212,175,55,0.28)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#cardGlow)" />
        {[48, 42, 36, 30, 24, 18, 12, 6].map((r, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="url(#waveStroke)"
            strokeWidth={0.5 + (i % 2) * 0.3}
            opacity={0.7 - i * 0.06}
          />
        ))}
      </svg>
      {/* Ligne dorée type veinure malachite */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 70% 60%, rgba(212,175,55,0.35), transparent 50%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col justify-between p-5 sm:p-6">
        {/* En-tête type carte : logo + puce */}
        <div className="flex items-start justify-between">
          <span className="inline-block shrink-0 whitespace-nowrap text-lg font-bold tracking-tight text-white drop-shadow-sm">Carte&nbsp;UP</span>
          <div className="flex items-center gap-2">
            <div
              className="h-8 w-10 rounded-md bg-gradient-to-br from-amber-200/90 to-amber-400/80"
              style={{ boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(0,0,0,0.2)' }}
              aria-hidden
            />
            <svg className="h-6 w-6 text-white/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
        </div>

        {/* Contenu : Cashback & Points */}
        <div className="grid grid-cols-2 gap-4 pt-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-white/80">
              <Wallet className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">Cashback</span>
            </div>
            <p className="mt-1 text-xl font-extrabold text-white sm:text-2xl">{cashbackLabel}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-white/75">
              Revient sur votre cagnotte
            </p>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-amber-200/90">
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-wider">Points</span>
            </div>
            <p className="mt-1 text-xl font-extrabold text-amber-200 sm:text-2xl">Cumulables</p>
            <p className="mt-0.5 text-[11px] leading-tight text-white/75">
              Boosts et avantages
            </p>
          </div>
        </div>

        {/* Pied de carte */}
        <div className="mt-3 flex items-center justify-end border-t border-white/10 pt-3">
          <span className="text-[10px] font-medium tracking-widest text-white/60">VOTRE CAGNOTTE</span>
        </div>
      </div>
    </div>
    </div>
  );
}
