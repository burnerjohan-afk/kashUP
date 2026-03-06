import type { Partner } from '../lib/api';
import { PartnerCard } from './PartnerCard';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Props = { partners: Partner[]; preview?: boolean };

export function PartnersSection({ partners, preview }: Props) {
  const list = preview ? partners.slice(0, 6) : partners;

  return (
    <section
      id="partenaires"
      className="scroll-mt-20 border-t border-slate-200/80 bg-slate-50 px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <h2 className="heading-section text-slate-900">
          Nos partenaires
        </h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Découvrez les commerces qui vous offrent du cashback et des points avec KashUP.
        </p>
        {partners.length === 0 ? (
          <p className="mt-8 text-slate-500">Aucun partenaire à afficher pour le moment.</p>
        ) : (
          <>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <li key={p.id}>
                  <Link href={`/partenaires/${p.id}`} className="block transition hover:opacity-95">
                    <PartnerCard partner={p} />
                  </Link>
                </li>
              ))}
            </ul>
            {preview && partners.length > 0 && (
              <div className="mt-10 text-center">
                <Link
                  href="/partenaires"
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-dark)] hover:shadow-lg"
                >
                  Voir tous les partenaires {partners.length > 6 ? `(${partners.length})` : ''}
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
