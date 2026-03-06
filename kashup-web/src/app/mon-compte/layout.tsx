import type { Metadata } from 'next';
import MonCompteGuard from './MonCompteGuard';
import MonCompteSidebar from './MonCompteSidebar';

export const metadata: Metadata = {
  title: 'Mon compte — KashUP',
  description: "Votre cagnotte, vos points, votre historique et vos bons d'achat KashUP.",
};

export default function MonCompteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MonCompteGuard>
      <div className="flex min-h-0 flex-1">
        <MonCompteSidebar />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </MonCompteGuard>
  );
}
