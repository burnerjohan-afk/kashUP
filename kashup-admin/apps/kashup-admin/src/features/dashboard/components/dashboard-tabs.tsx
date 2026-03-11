import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Territory } from '@/types/entities';

type DashboardTabsProps = {
  selectedTerritory: Territory | 'all';
  onTerritoryChange: (territory: Territory | 'all') => void;
  children: ReactNode;
};

export const DashboardTabs = ({ selectedTerritory, onTerritoryChange, children }: DashboardTabsProps) => {
  const territories: Array<{ id: Territory | 'all'; label: string }> = [
    { id: 'all', label: 'Tous départements' },
    { id: 'martinique', label: 'Martinique' },
    { id: 'guadeloupe', label: 'Guadeloupe' },
    { id: 'guyane', label: 'Guyane' },
  ];

  return (
    <div className="min-w-0">
      <div className="mb-6 border-b border-ink/10">
        <nav className="flex flex-wrap gap-2 sm:gap-4">
          {territories.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onTerritoryChange(id)}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors sm:px-4',
                selectedTerritory === id
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-ink/50 hover:text-ink',
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
};

