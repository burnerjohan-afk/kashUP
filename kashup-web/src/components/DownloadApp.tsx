'use client';

import { Shield, Lock, CreditCard, Check } from 'lucide-react';
import { StoreBadges } from './StoreBadges';
import { Star } from 'lucide-react';

const BULLETS = [
  'Connexion bancaire sécurisée (partenaire Powens)',
  'Cashback crédité automatiquement à chaque achat',
  'Cartes cadeaux et dons en un clic',
];

export default function DownloadApp() {
  return (
    <section
      id="telecharger"
      className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24"
      style={{
        background: 'linear-gradient(160deg, #0f0725 0%, #1e1b4b 40%, #312e81 100%)',
        boxShadow: 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
      }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="heading-section text-white">
          Rejoignez ceux qui récupèrent du cashback chaque jour
        </h2>
        <p className="mt-4 text-lg text-white/90">
          Téléchargez l’app, connectez votre carte en toute sécurité et commencez à cumuler.
        </p>

        <ul className="mt-10 flex flex-col items-center gap-4">
          {BULLETS.map((label, i) => (
            <li key={i} className="flex items-center gap-3 text-left text-white/95">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20">
                <Check className="h-5 w-5" aria-hidden />
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-12">
          <StoreBadges />
        </div>

        <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/70">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
          <span className="font-medium text-white/90">4,5/5</span>
          <span>sur l’App Store</span>
        </p>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-white/85">
          <span className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--primary)]" aria-hidden />
            Sécurisé par Powens
          </span>
          <span className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[var(--primary)]" aria-hidden />
            Données protégées (RGPD)
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-[var(--primary)]" aria-hidden />
            Agrégation bancaire certifiée
          </span>
        </div>
      </div>
    </section>
  );
}
