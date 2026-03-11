import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { AssociationsTab } from '../components/associations-tab';
import { ProjetsTab } from '../components/projets-tab';

export const DonationsPage = () => {
  const [activeTab, setActiveTab] = useState<'associations' | 'projets'>('associations');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dons</h1>
          <p className="text-sm text-ink/50">Gestion des associations et projets</p>
        </div>
      </div>

      <div className="mb-6 border-b border-ink/10">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('associations')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'associations'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Associations
          </button>
          <button
            onClick={() => setActiveTab('projets')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'projets'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Projets
          </button>
        </nav>
      </div>

      {activeTab === 'associations' && <AssociationsTab />}

      {activeTab === 'projets' && <ProjetsTab />}
    </div>
  );
};
