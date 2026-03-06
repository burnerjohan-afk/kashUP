import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getGiftCardOffers, getGiftCardBoxes } from '../../lib/api';
import { CartesBoxSection } from '../../components/CartesBoxSection';

export const metadata = {
  title: 'Cartes & Box — KashUP',
  description: 'Cartes cadeaux et box chez les partenaires KashUP.',
};

export default async function CartesBoxPage() {
  let offers: Awaited<ReturnType<typeof getGiftCardOffers>> = [];
  let boxes: Awaited<ReturnType<typeof getGiftCardBoxes>> = [];
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

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Header />
      <main className="flex-1">
        <section className="border-b border-zinc-200/80 bg-gradient-to-b from-[var(--background-dark)] to-[var(--background)] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
              Cartes & Box
            </h1>
            <p className="mt-2 text-zinc-600">
              Utilisez votre cagnotte pour acheter des cartes cadeaux ou des box chez nos partenaires.
            </p>
          </div>
        </section>
        <CartesBoxSection offers={offers} boxes={boxes} />
      </main>
      <Footer />
    </div>
  );
}
