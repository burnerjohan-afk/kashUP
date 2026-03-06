import type { Partner } from '../lib/api';

type Props = { partners: Partner[] };

export function PartnersLogoStrip({ partners }: Props) {
  if (partners.length === 0) return null;

  return (
    <section className="border-y border-slate-200/80 bg-white px-4 py-14 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <h2 className="heading-section text-center text-slate-900">
          Des partenaires pour économiser au quotidien
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-center text-slate-600">
          Rejoignez les commerces qui récompensent vos achats avec du cashback et des points.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {partners.map((p) => (
            <div
              key={p.id}
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-slate-50 shadow-sm transition duration-300 hover:scale-105 hover:bg-white hover:shadow-md sm:h-20 sm:w-24"
            >
              {p.logoUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={p.logoUrl}
                  alt=""
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="text-sm font-bold text-slate-400">
                  {p.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
