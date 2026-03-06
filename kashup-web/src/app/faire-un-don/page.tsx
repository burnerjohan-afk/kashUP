import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getDonationCategoriesWithAssociations } from '../../lib/api';
import Link from 'next/link';
import { Heart, ArrowRight, Sparkles, HandHeart } from 'lucide-react';

export const metadata = {
  title: 'Fais un don — KashUP',
  description:
    'Soutenez les associations avec votre cagnotte KashUP. Faites un don directement sur le site, depuis votre compte.',
};

type PageProps = { searchParams?: Promise<{ don?: string }> };
export default async function FaireUnDonPage({ searchParams }: PageProps) {
  let categories: Awaited<ReturnType<typeof getDonationCategoriesWithAssociations>> = [];
  try {
    categories = await getDonationCategoriesWithAssociations();
  } catch {
    categories = [];
  }
  const sp = searchParams ? await searchParams : {};
  const showDonSuccess = sp?.don === 'ok';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <Header />
      <main className="flex-1">
        {/* Hero — charte graphique (vert / slate, pas de rose) */}
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-white px-4 pt-14 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              backgroundImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(5, 150, 105, 0.08), transparent 60%)',
            }}
            aria-hidden
          />
          <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-[var(--primary)]/10 blur-3xl" aria-hidden />
          <div className="absolute bottom-1/4 left-0 h-40 w-40 rounded-full bg-[var(--accent-violet)]/10 blur-3xl" aria-hidden />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary)]/10 shadow-sm ring-1 ring-[var(--primary)]/20">
              <Heart className="h-8 w-8 text-[var(--primary)]" aria-hidden />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              Fais un don
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600 sm:text-xl">
              Utilisez une part de votre cagnotte KashUP pour soutenir des associations. Choisissez une cause et le montant : les dons se font directement sur le site, depuis votre compte.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <span className="rounded-full bg-[var(--primary-light)] px-4 py-2.5 text-sm font-semibold text-[var(--primary-dark)] shadow-sm ring-1 ring-[var(--primary)]/20">
                <Sparkles className="mr-1.5 inline h-4 w-4" />
                100 % depuis votre cagnotte
              </span>
              <span className="rounded-full bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/80">
                <HandHeart className="mr-1.5 inline h-4 w-4 text-[var(--primary)]" />
                Don en quelques clics sur le site
              </span>
            </div>
          </div>
        </section>

        {/* Contenu principal */}
        <section className="px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-4xl">
            {showDonSuccess && (
              <div className="mb-8 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary-light)] px-6 py-4 text-center text-[var(--primary-dark)] font-semibold">
                Merci ! Votre don a bien été enregistré.
              </div>
            )}
            {categories.length === 0 ? (
              <div className="card-premium overflow-hidden p-10 text-center sm:p-14">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--primary-light)]">
                  <Heart className="h-10 w-10 text-[var(--primary)]" aria-hidden />
                </div>
                <h2 className="mt-6 text-xl font-bold text-slate-900">Aucune association pour le moment</h2>
                <p className="mt-2 text-slate-600">
                  Les associations seront bientôt disponibles. Connectez-vous à votre compte pour gérer votre cagnotte.
                </p>
                <Link
                  href="/connexion"
                  className="btn-cta-animate mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[var(--primary-dark)] hover:shadow-lg"
                >
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-10">
                {categories.map((cat) => (
                  <article
                    key={cat.id}
                    className="card-premium overflow-hidden transition hover:shadow-lg"
                  >
                    <div className="border-b border-slate-100 bg-white px-6 py-5 sm:px-8 sm:py-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl shadow-sm"
                          style={{
                            backgroundColor: cat.accent ? `${cat.accent}18` : 'var(--primary-light)',
                            color: cat.accent || 'var(--primary)',
                          }}
                        >
                          <Heart className="h-6 w-6" />
                        </div>
                        <div>
                          <h2
                            className="text-xl font-bold text-slate-900 sm:text-2xl"
                            style={cat.accent ? { color: cat.accent } : undefined}
                          >
                            {cat.title}
                          </h2>
                          <p className="mt-0.5 text-sm font-medium text-slate-500">
                            {cat.associations.length} association{cat.associations.length > 1 ? 's' : ''} à soutenir
                          </p>
                        </div>
                      </div>
                    </div>
                    <ul className="grid gap-0 sm:grid-cols-2">
                      {cat.associations.map((asso) => (
                        <li
                          key={asso.id}
                          className="group flex gap-4 border-b border-slate-100 p-5 transition last:border-b-0 hover:bg-slate-50/60 sm:border-b-0 sm:border-r sm:even:border-r-0 sm:p-6"
                        >
                          {asso.imageUrl ? (
                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200/80">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={asso.imageUrl}
                                alt=""
                                className="h-full w-full object-cover transition group-hover:scale-105"
                              />
                            </div>
                          ) : (
                            <div
                              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-sm ring-1 ring-slate-200/80"
                              style={{ backgroundColor: cat.accent ?? 'var(--primary)' }}
                            >
                              {asso.name.slice(0, 1)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-900 group-hover:text-[var(--primary)]">
                              {asso.name}
                            </h3>
                            {asso.description && (
                              <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-600">
                                {asso.description}
                              </p>
                            )}
                            {asso.impact && (
                              <p className="mt-2 inline-flex items-center rounded-lg bg-[var(--primary-light)] px-2.5 py-1 text-xs font-semibold text-[var(--primary-dark)] ring-1 ring-[var(--primary)]/20">
                                {asso.impact}
                              </p>
                            )}
                            <Link
                              href={`/faire-un-don/don/${asso.id}`}
                              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[var(--primary-dark)]"
                            >
                              Faire un don
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}

            {/* CTA : dons sur le site */}
            <div className="mt-14 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg ring-1 ring-slate-200/50">
              <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-6 sm:px-8">
                <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                  Les dons se font sur le site KashUP
                </h2>
                <p className="mt-2 text-slate-600">
                  Connectez-vous à votre compte, puis choisissez une association et le montant à reverser depuis votre cagnotte. Simple et transparent.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-4 px-6 py-8 sm:gap-6">
                <Link
                  href="/connexion"
                  className="btn-cta-animate inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-[var(--primary-dark)] hover:shadow-lg"
                >
                  Se connecter pour faire un don
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/mon-compte"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Voir ma cagnotte
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
