import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { PartnerForm } from './partner-form';
import { PartnerStatistics } from './partner-statistics';
import type { Partner } from '@/types/entities';
import type { PartnerFormInput } from '../api';

type PartnerTabsProps = {
  partner: Partner;
  onUpdate: (values: Partial<PartnerFormInput>) => void;
  isUpdating: boolean;
};

export const PartnerTabs = ({ partner, onUpdate, isUpdating }: PartnerTabsProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'statistics'>('details');

  return (
    <div>
      <div className="mb-6 border-b border-ink/10">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'details'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Détails
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'statistics'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Statistiques
          </button>
        </nav>
      </div>

      {activeTab === 'details' && (
        <PartnerForm partner={partner} onSubmit={onUpdate} isLoading={isUpdating} />
      )}

      {activeTab === 'statistics' && <PartnerStatistics partnerId={partner.id} />}
    </div>
  );
};

