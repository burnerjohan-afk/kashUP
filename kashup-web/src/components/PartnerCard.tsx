import type { Partner } from '../lib/api';
import { Tag, Gift, Star } from 'lucide-react';

type Props = { partner: Partner; compact?: boolean };

function permanentRate(p: Partner): number {
  if (typeof p.permanentCashbackRate === 'number') return p.permanentCashbackRate;
  if (typeof p.tauxCashbackBase === 'number') return p.tauxCashbackBase;
  return 0;
}

function welcomeRate(p: Partner): number {
  if (typeof p.discoveryCashbackRate === 'number') return p.discoveryCashbackRate;
  return 0;
}

/** Carte partenaire à l’identique de l’app : logo, nom, cashback (Permanent | Bienvenue), points. */
export function PartnerCard({ partner: p, compact }: Props) {
  return (
    <article className="card-premium flex gap-4 p-4 transition sm:p-5">
      <div className="h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-slate-50">
        {p.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={p.logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xl font-bold text-slate-400">
            {p.name.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] font-bold leading-tight text-slate-900">
          {p.name}
        </h3>
        {p.category?.name && !compact && (
          <p className="mt-0.5 text-sm text-slate-500">{p.category.name}</p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex flex-1 items-center gap-1">
            <Tag className="h-3 w-3 shrink-0 text-[var(--primary)]" strokeWidth={2.5} />
            <span className="text-xs font-bold text-[var(--primary)]">{permanentRate(p)}%</span>
            <span className="text-[9px] font-semibold text-slate-500">Permanent</span>
          </div>
          <span className="h-4 w-px shrink-0 bg-slate-200" />
          <div className="flex flex-1 items-center gap-1">
            <Gift className="h-3 w-3 shrink-0 text-[var(--accent-violet)]" strokeWidth={2.5} />
            <span className="text-xs font-bold text-[var(--accent-violet)]">{welcomeRate(p)}%</span>
            <span className="text-[9px] font-semibold text-slate-500">Bienvenue</span>
          </div>
        </div>
        {typeof p.pointsPerTransaction === 'number' && p.pointsPerTransaction > 0 && (
          <div className="mt-1.5 flex items-center gap-1">
            <Star className="h-2.5 w-2.5 shrink-0 text-[var(--accent-yellow)]" strokeWidth={2.5} fill="currentColor" />
            <span className="text-[11px] font-semibold text-[var(--accent-amber)]">
              {p.pointsPerTransaction} pts
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
