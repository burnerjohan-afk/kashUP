import Header from '../components/Header';
import Footer from '../components/Footer';
import DownloadApp from '../components/DownloadApp';
import { getPartners, getGiftCardOffers, getGiftCardBoxes } from '../lib/api';
import { PartnersSection } from '../components/PartnersSection';
import { CartesBoxSection } from '../components/CartesBoxSection';
import { HeroSection } from '../components/HeroSection';
import { BenefitsStrip } from '../components/BenefitsStrip';
import { PartnersLogoStrip } from '../components/PartnersLogoStrip';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { AnimateOnScroll } from '../components/AnimateOnScroll';
import { StatBlock } from '../components/StatBlock';
import { KashUPCard } from '../components/KashUPCard';
import Link from 'next/link';
import { ChevronRight, ShoppingBag, Wallet, Gift } from 'lucide-react';

function getMaxCashbackRate(partners: { tauxCashbackBase?: number; discoveryCashbackRate?: number | null; permanentCashbackRate?: number | null }[]): number {
  let max = 0;
  for (const p of partners) {
    const rate = Math.max(
      p.tauxCashbackBase ?? 0,
      p.discoveryCashbackRate ?? 0,
      p.permanentCashbackRate ?? 0
    );
    if (rate > max) max = rate;
  }
  return max;
}

const STEPS = [
  {
    step: 1,
    title: 'Vous achetez via KashUP',
    description: 'Passez par KashUP et faites vos achats comme d’habitude chez les partenaires.',
    icon: ShoppingBag,
  },
  {
    step: 2,
    title: 'Les partenaires nous rémunèrent',
    description: 'Dans le cadre de partenariats commerciaux, une part nous est versée.',
    icon: Wallet,
  },
  {
    step: 3,
    title: 'On partage avec vous',
    description: 'C’est comme ça que vous gagnez du cashback, des points, cartes cadeaux ou dons.',
    icon: Gift,
  },
];

export default async function Home() {
  let partners: Awaited<ReturnType<typeof getPartners>>['partners'] = [];
  let offers: Awaited<ReturnType<typeof getGiftCardOffers>> = [];
  let boxes: Awaited<ReturnType<typeof getGiftCardBoxes>> = [];

  try {
    const partnersRes = await getPartners();
    partners = partnersRes.partners ?? [];
  } catch {
    partners = [];
  }
  try {
    offers = await getGiftCardOffers();
    if (!Array.isArray(offers)) offers = [];
  } catch {
    offers = [];
  }
  try {
    boxes = await getGiftCardBoxes();
    if (!Array.isArray(boxes)) boxes = [];
  } catch {
    boxes = [];
  }

  const maxCashback = getMaxCashbackRate(partners);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Header />
      <main className="flex-1">
        <HeroSection maxCashback={maxCashback} partnersCount={partners.length} />

        {/* Carte KashUP type carte bancaire (forme + fond vagues concentriques / malachite) */}
        <section id="carte-kashup" className="relative z-10 bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-lg">
            <p className="text-center text-sm font-semibold uppercase tracking-wider text-slate-500">Votre cagnotte</p>
            <h2 className="mt-1 text-center text-xl font-bold text-slate-900 sm:text-2xl">Cashback & Points</h2>
            <div className="mt-8 flex justify-center pb-12">
              <KashUPCard maxCashback={maxCashback} />
            </div>
          </div>
        </section>

        {partners.length > 0 && (
          <AnimateOnScroll>
            <StatBlock partnersCount={partners.length} />
          </AnimateOnScroll>
        )}

        <AnimateOnScroll>
          <BenefitsStrip />
        </AnimateOnScroll>

        {partners.length > 0 && (
          <AnimateOnScroll delay={100}>
            <PartnersLogoStrip partners={partners.slice(0, 8)} />
          </AnimateOnScroll>
        )}

        {/* Comment ça marche — 3 étapes avec stagger */}
        <section className="border-t border-slate-200/80 bg-white px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-6xl lg:max-w-7xl">
            <AnimateOnScroll>
              <h2 className="heading-section text-slate-900">
                Comment fonctionne le cashback KashUP
              </h2>
              <p className="mt-2 max-w-2xl text-slate-600">
                Vous achetez comme d’habitude chez nos partenaires, on vous redonne une part en cashback. Utilisez votre cagnotte en cartes cadeaux ou en dons.
              </p>
            </AnimateOnScroll>
            <AnimateOnScroll variant="stagger" className="mt-12 grid gap-8 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.step} className="relative text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <s.icon className="h-7 w-7" aria-hidden />
                  </div>
                  <p className="mt-4 text-sm font-bold text-[var(--primary)]">Étape {s.step}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{s.title}</h3>
                  <p className="mt-2 text-slate-600">{s.description}</p>
                </div>
              ))}
            </AnimateOnScroll>
            <AnimateOnScroll delay={200} className="mt-10 text-center">
              <Link
                href="/principe"
                className="btn-cta-animate inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-[var(--primary-dark)] hover:shadow-xl"
              >
                Découvrir les principes en détail
                <ChevronRight className="h-4 w-4" />
              </Link>
            </AnimateOnScroll>
          </div>
        </section>

        <AnimateOnScroll>
          <PartnersSection partners={partners} preview />
        </AnimateOnScroll>

        <AnimateOnScroll delay={100}>
          <CartesBoxSection offers={offers} boxes={boxes} preview />
        </AnimateOnScroll>

        <AnimateOnScroll>
          <TestimonialsSection />
        </AnimateOnScroll>

        <AnimateOnScroll variant="fadeIn">
          <DownloadApp />
        </AnimateOnScroll>
      </main>
      <Footer />
    </div>
  );
}
