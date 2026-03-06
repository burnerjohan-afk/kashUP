import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-lg font-bold text-[var(--primary)]">KashUP</p>
            <p className="mt-2 text-sm text-slate-600">
              Financez votre quotidien, boostez vos causes. Pensé pour la Caraïbe.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Navigation</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="/" className="hover:text-[var(--primary)]">Accueil</Link></li>
              <li><Link href="/principe" className="hover:text-[var(--primary)]">Principe</Link></li>
              <li><Link href="/partenaires" className="hover:text-[var(--primary)]">Partenaires</Link></li>
              <li><Link href="/cartes-box" className="hover:text-[var(--primary)]">Cartes & Box</Link></li>
              <li><Link href="/faire-un-don" className="hover:text-[var(--primary)]">Fais un don</Link></li>
              <li><a href="/#telecharger" className="hover:text-[var(--primary)]">Télécharger l’app</a></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Légal</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="#" className="hover:text-[var(--primary)]">Mentions légales</Link></li>
              <li><Link href="#" className="hover:text-[var(--primary)]">Politique de confidentialité</Link></li>
              <li><Link href="#" className="hover:text-[var(--primary)]">CGU</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">L’app</p>
            <p className="mt-2 text-sm text-slate-600">
              Cashback, points, cartes cadeaux et dons. 100 % sécurisé avec Powens.
            </p>
          </div>
        </div>
        <div className="mt-10 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} KashUP — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}
