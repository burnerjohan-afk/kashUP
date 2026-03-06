import type { Metadata } from 'next';
import EspacePartenaireGuard from './EspacePartenaireGuard';
import EspacePartenaireSidebar from './EspacePartenaireSidebar';

export const metadata: Metadata = {
  title: 'Espace partenaire — KashUP',
  description: 'Tableau de bord partenaire : impact KashUP sur votre activité.',
};

export default function EspacePartenaireLayout({ children }: { children: React.ReactNode }) {
  return (
    <EspacePartenaireGuard>
      <div className="flex min-h-0 flex-1">
        <EspacePartenaireSidebar />
        <main className="min-w-0 flex-1 overflow-auto">{children}</main>
      </div>
    </EspacePartenaireGuard>
  );
}
