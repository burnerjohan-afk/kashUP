import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import type { Territory } from '@/types/entities';

type DashboardTabsProps = {
  selectedTerritory: Territory | 'all';
  onTerritoryChange: (territory: Territory | 'all') => void;
  children: ReactNode;
};

export const DashboardTabs = ({ selectedTerritory, onTerritoryChange, children }: DashboardTabsProps) => {
  return (
    <div>
      <div className="mb-6 border-b border-ink/10">
        <nav className="flex gap-4">
          <button
            onClick={() => onTerritoryChange('all')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              selectedTerritory === 'all'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Tous départements
          </button>
          <button
            onClick={() => onTerritoryChange('martinique')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              selectedTerritory === 'martinique'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Martinique
          </button>
          <button
            onClick={() => onTerritoryChange('guadeloupe')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              selectedTerritory === 'guadeloupe'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Guadeloupe
          </button>
          <button
            onClick={() => onTerritoryChange('guyane')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              selectedTerritory === 'guyane'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Guyane
          </button>
        </nav>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
};

