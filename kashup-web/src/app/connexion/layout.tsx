import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connexion — KashUP',
  description: 'Connectez-vous à votre compte KashUP pour accéder à votre cagnotte et vos avantages.',
};

export default function ConnexionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
