import { ShoppingCart, Wallet, Gift } from 'lucide-react';

const ITEMS = [
  {
    icon: ShoppingCart,
    title: 'Vous achetez comme d’habitude',
    description: 'Chez les commerces partenaires KashUP, sans changer vos habitudes. Paiement en caisse ou en ligne.',
    color: 'bg-[var(--primary)]/10 text-[var(--primary)]',
  },
  {
    icon: Wallet,
    title: 'Votre cagnotte grandit sans effort',
    description: 'Le cashback est crédité automatiquement à chaque achat détecté. Rien à faire, tout est 100 % automatique.',
    color: 'bg-violet-500/10 text-violet-600',
  },
  {
    icon: Gift,
    title: 'Utilisez-la en cartes ou en dons',
    description: 'Cartes cadeaux partenaires, box ou soutien à une cause locale. Vous choisissez comment utiliser vos gains.',
    color: 'bg-amber-500/10 text-amber-700',
  },
];

export function BenefitsStrip() {
  return (
    <section className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl lg:max-w-7xl">
        <h2 className="heading-section text-center text-slate-900">
          Comment KashUP vous accompagne
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
          Trois étapes simples pour récupérer du cashback et en profiter.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3 lg:gap-8">
          {ITEMS.map((item, i) => (
            <div
              key={i}
              className="card-premium flex flex-col p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--primary)]/30 hover:shadow-xl sm:p-8"
            >
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl ${item.color}`}>
                <item.icon className="h-7 w-7" aria-hidden />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {item.title}
              </h3>
              <p className="mt-2 flex-1 text-slate-600">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
