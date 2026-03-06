import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { getPartner } from '../../../lib/api';
import Link from 'next/link';
import { ArrowLeft, Tag, Gift, Star, MapPin, Zap, TrendingUp } from 'lucide-react';
import { PartnerContactByTerritory } from '../../../components/PartnerContactByTerritory';
import { notFound } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

function permanentRate(p: Awaited<ReturnType<typeof getPartner>>): number {
  if (!p) return 0;
  if (typeof p.permanentCashbackRate === 'number') return p.permanentCashbackRate;
  if (typeof p.tauxCashbackBase === 'number') return p.tauxCashbackBase;
  return 0;
}

function welcomeRate(p: Awaited<ReturnType<typeof getPartner>>): number {
  if (!p) return 0;
  if (typeof p.discoveryCashbackRate === 'number') return p.discoveryCashbackRate;
  return 0;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const partner = await getPartner(id);
  if (!partner) return { title: 'Partenaire — KashUP' };
  return {
    title: `${partner.name} — Partenaire KashUP`,
    description: partner.shortDescription ?? `Cashback et avantages chez ${partner.name} avec KashUP.`,
  };
}

export default async function PartnerDetailPage({ params }: Props) {
  const { id } = await params;
  const partner = await getPartner(id);
  if (!partner) notFound();

  const permanent = permanentRate(partner);
  const welcome = welcomeRate(partner);
  const points = typeof partner.pointsPerTransaction === 'number' ? partner.pointsPerTransaction : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Header />
      <main className="flex-1">
        <section className="border-b border-slate-200/80 bg-white px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-3xl">
            <Link
              href="/partenaires"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[var(--primary)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux partenaires
            </Link>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto max-w-3xl">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
              {/* En-tête partenaire */}
              <div className="flex flex-col items-center border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white p-8 text-center sm:flex-row sm:gap-8 sm:text-left">
                <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white ring-2 ring-slate-100 shadow-md sm:h-32 sm:w-32">
                  {partner.logoUrl ? (
                    <img
                      src={partner.logoUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
                      {partner.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="mt-4 sm:mt-0 sm:flex-1">
                  <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                    {partner.name}
                  </h1>
                  {partner.category?.name && (
                    <p className="mt-1 flex items-center justify-center gap-1 text-slate-500 sm:justify-start">
                      <MapPin className="h-4 w-4" aria-hidden />
                      {partner.category.name}
                    </p>
                  )}
                  {(partner.marketingPrograms?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
                      {partner.marketingPrograms?.includes('pepites') && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-800">
                          <Star className="h-2.5 w-2.5 text-amber-500" strokeWidth={2.5} fill="currentColor" aria-hidden />
                          Pépite
                        </span>
                      )}
                      {partner.marketingPrograms?.includes('boosted') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#05A357] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          <Zap className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                          Boosté
                        </span>
                      )}
                      {partner.marketingPrograms?.includes('most-searched') && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#EA580C] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          <TrendingUp className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
                          Populaire
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bloc Cashback & Points — design type onglets / cartes mis en avant */}
              <div className="border-b border-slate-100 p-6">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  Avantages KashUP
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-6 shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/20">
                      <Tag className="h-7 w-7 text-[var(--primary)]" aria-hidden />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-[var(--primary)]">{permanent} %</p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Cashback permanent
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Sur vos achats</p>
                  </div>
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-violet-200 bg-gradient-to-b from-violet-50 to-white p-6 shadow-sm">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20">
                      <Gift className="h-7 w-7 text-violet-600" aria-hidden />
                    </div>
                    <p className="mt-3 text-3xl font-extrabold text-violet-600">{welcome} %</p>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Offre de bienvenue
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Premiers achats</p>
                  </div>
                  {points > 0 ? (
                    <div className="col-span-2 flex flex-col items-center justify-center rounded-2xl border-2 border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 shadow-sm sm:col-span-1">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/20">
                        <Star className="h-7 w-7 text-amber-600" aria-hidden />
                      </div>
                      <p className="mt-3 text-3xl font-extrabold text-amber-700">{points} pts</p>
                      <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-600">
                        Par transaction
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Infos pratiques et réseaux par département (sélecteur + détection par géolocalisation) */}
              <PartnerContactByTerritory partner={partner} />

              {/* Description */}
              {(partner.shortDescription || partner.description) && (
                <div className="p-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    À propos
                  </h2>
                  <p className="mt-2 text-slate-700">
                    {partner.shortDescription ?? partner.description}
                  </p>
                </div>
              )}

              {/* CTA */}
              <div className="border-t border-slate-100 bg-slate-50/50 p-6">
                <p className="text-center text-sm text-slate-600">
                  Achetez chez {partner.name} avec votre carte reliée à KashUP pour cumuler du cashback.
                </p>
                <div className="mt-4 flex justify-center">
                  <a
                    href="/#telecharger"
                    className="rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-[var(--primary-dark)]"
                  >
                    Télécharger l’app KashUP
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
