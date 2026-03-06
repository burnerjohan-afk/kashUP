import { ShoppingBag, Wallet, Gift } from 'lucide-react';

/** Contenu « Comment ça marche » — utilisé sur la page Principe et en teaser sur l’accueil */
export function PrincipeContent() {
  return (
    <div className="grid gap-6 sm:grid-cols-3">
      <div className="rounded-2xl border-2 border-[var(--primary)]/20 bg-white p-6 shadow-md transition hover:shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
          <ShoppingBag className="h-6 w-6 text-[var(--primary)]" />
        </div>
        <h3 className="mt-4 font-semibold text-zinc-900">Achetez chez les partenaires</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Consommez chez les commerces partenaires KashUP pour activer le cashback.
        </p>
      </div>
      <div className="rounded-2xl border-2 border-[var(--primary)]/20 bg-white p-6 shadow-md transition hover:shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
          <Wallet className="h-6 w-6 text-[var(--primary)]" />
        </div>
        <h3 className="mt-4 font-semibold text-zinc-900">Cumulez du cashback</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Une partie de vos achats revient sur votre cagnotte KashUP, selon les taux des partenaires.
        </p>
      </div>
      <div className="rounded-2xl border-2 border-[var(--primary)]/20 bg-white p-6 shadow-md transition hover:shadow-lg">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15">
          <Gift className="h-6 w-6 text-[var(--primary)]" />
        </div>
        <h3 className="mt-4 font-semibold text-zinc-900">Utilisez votre cagnotte</h3>
        <p className="mt-2 text-sm text-zinc-600">
          Cartes cadeaux, dons ou boost pour plus tard.
        </p>
      </div>
    </div>
  );
}
