import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import type { User } from '@/types/entities';
import { UserDetailContent } from './user-detail-content';
import { UserStatistics } from './user-statistics';

type UserTabsProps = {
  user: User;
};

export const UserTabs = ({ user }: UserTabsProps) => {
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

      {activeTab === 'details' && <UserDetailContent user={user} />}
      {activeTab === 'statistics' && <UserStatistics userId={user.id} />}
    </div>
  );
};

