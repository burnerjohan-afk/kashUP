import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { getPartners, getPartnerCategories } from '../../lib/api';
import { PartnersPageContent } from '../../components/PartnersPageContent';

export const metadata = {
  title: 'Partenaires — KashUP',
  description: 'Découvrez les commerces partenaires KashUP et leurs taux de cashback.',
};

export default async function PartenairesPage() {
  let partners: Awaited<ReturnType<typeof getPartners>>['partners'] = [];
  let categories: Awaited<ReturnType<typeof getPartnerCategories>> = [];
  try {
    const [partnersRes, categoriesList] = await Promise.all([
      getPartners({ pageSize: 200 }),
      getPartnerCategories(),
    ]);
    partners = partnersRes.partners ?? [];
    categories = Array.isArray(categoriesList) ? categoriesList : [];
  } catch {
    partners = [];
    categories = [];
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--background)' }}>
      <Header />
      <main className="flex-1 border-t border-slate-200/80 bg-slate-50/50">
        <section className="border-b border-slate-200/80 bg-gradient-to-b from-slate-100 to-slate-50/80 px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-6xl lg:max-w-7xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Partenaires
            </h1>
            <p className="mt-2 text-slate-600">
              Filtrez par catégorie et territoire, découvrez les pépites et les partenaires boostés.
            </p>
          </div>
        </section>
        <PartnersPageContent partners={partners} categories={categories} />
      </main>
      <Footer />
    </div>
  );
}
