import { Link } from 'react-router-dom';
import { PasswordResetForm } from '../components/password-reset-form';

export const PasswordResetPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-white to-primary/5 p-6 dark:from-primary/20 dark:via-[#12041F] dark:to-[#12041F]">
    <div className="w-full max-w-md rounded-3xl bg-surface p-10 shadow-soft dark:bg-surface/80">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wide text-ink/40">Assistance KashUP</p>
        <h1 className="text-2xl font-semibold text-ink">Réinitialiser le mot de passe</h1>
        <p className="text-sm text-ink/60">Le lien est valable 30 minutes.</p>
      </div>
      <PasswordResetForm />
      <Link
        to="/login"
        className="mt-4 block text-center text-sm font-medium text-primary hover:text-primary-hover"
      >
        Retour à la connexion
      </Link>
    </div>
  </div>
);


