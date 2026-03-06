import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { PrincipeProcess } from '../../components/PrincipeProcess';
import { PrincipeConnexion } from '../../components/PrincipeConnexion';
import { PrincipeCashback } from '../../components/PrincipeCashback';
import { PrincipeCartesBox } from '../../components/PrincipeCartesBox';

export const metadata = {
  title: 'Principe — KashUP',
  description:
    'Comment fonctionne KashUP : connexion bancaire sécurisée, cashback, cartes et box. Sécurité et partenaire Powens.',
};

export default function PrincipePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Header />
      <main className="flex-1">
        {/* En-tête court */}
        <section className="border-b border-slate-200/80 bg-white px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="heading-section text-slate-900">
              Comment ça marche ?
            </h1>
            <p className="mt-3 text-lg text-slate-600">
              En 3 étapes : achetez chez nos partenaires, cumulez du cashback, utilisez votre cagnotte.
            </p>
          </div>
        </section>

        <div className="mx-auto max-w-6xl space-y-20 px-4 py-16 sm:px-6 lg:max-w-7xl">
          <PrincipeProcess />
          <PrincipeConnexion />
          <PrincipeCashback />
          <PrincipeCartesBox />
        </div>
      </main>
      <Footer />
    </div>
  );
}
