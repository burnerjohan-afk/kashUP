import type { GiftOffer, GiftBox } from '../lib/api';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Props = { offers: GiftOffer[]; boxes: GiftBox[]; preview?: boolean };

function formatPrice(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

export function CartesBoxSection({ offers, boxes, preview }: Props) {
  const showOffers = preview ? offers.slice(0, 3) : offers;
  const showBoxes = preview ? boxes.slice(0, 3) : boxes;
  const hasMore = preview && (offers.length > 0 || boxes.length > 0);

  return (
    <section
      id="cartes-box"
      className="scroll-mt-20 border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <h2 className="heading-section text-slate-900">Cartes & Box</h2>
        <p className="mt-2 max-w-2xl text-slate-600">
          Utilisez votre cagnotte pour acheter des cartes cadeaux ou des box chez nos partenaires.
        </p>

        {offers.length > 0 && (
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-slate-900">Cartes et offres</h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showOffers.map((o) => (
                <li
                  key={o.id}
                  className="card-premium overflow-hidden transition"
                >
                  {o.imageUrl && (
                    <div className="relative h-40 w-full bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={o.imageUrl} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-semibold text-slate-900">{o.title}</p>
                    {o.partner?.name && (
                      <p className="text-sm text-slate-500">{o.partner.name}</p>
                    )}
                    <p className="mt-2 text-lg font-bold text-[var(--primary)]">
                      À partir de {formatPrice(o.price)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {boxes.length > 0 && (
          <div className="mt-12">
            <h3 className="text-lg font-semibold text-slate-900">Box</h3>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {showBoxes.map((b) => (
                <li
                  key={b.id}
                  className="card-premium overflow-hidden transition"
                >
                  {(b.imageUrl || b.heroImageUrl) && (
                    <div className="relative h-40 w-full bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={b.imageUrl || b.heroImageUrl || ''}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col p-5">
                    <p className="font-semibold text-slate-900">{b.title}</p>
                    {b.shortDescription && (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{b.shortDescription}</p>
                    )}
                    {(typeof b.priceFrom === 'number' || typeof b.value === 'number') && (
                      <p className="mt-2 text-lg font-bold text-[var(--primary)]">
                        À partir de {formatPrice(b.priceFrom ?? b.value ?? 0)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {hasMore && (
          <div className="mt-10 text-center">
            <Link
              href="/cartes-box"
              className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-dark)] hover:shadow-lg"
            >
              Voir toutes les cartes et box
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {offers.length === 0 && boxes.length === 0 && (
          <p className="mt-8 text-slate-500">Aucune carte ou box à afficher pour le moment.</p>
        )}
      </div>
    </section>
  );
}
