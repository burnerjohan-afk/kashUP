import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { BoostsTab } from './boosts-tab';
import { BadgesTab } from './badges-tab';
import { LotteriesTab } from './lotteries-tab';
import { ChallengesTab } from './challenges-tab';
import { GamesTab } from './games-tab';

type RewardsTabsProps = {
  children?: never;
};

export const RewardsTabs = ({}: RewardsTabsProps) => {
  const [activeTab, setActiveTab] = useState<'boosts' | 'badges' | 'lotteries' | 'challenges' | 'games'>('boosts');

  return (
    <div>
      <div className="mb-6 border-b border-ink/10">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('boosts')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'boosts'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Boosts
          </button>
          <button
            onClick={() => setActiveTab('badges')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'badges'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Badges
          </button>
          <button
            onClick={() => setActiveTab('lotteries')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'lotteries'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Loteries
          </button>
          <button
            onClick={() => setActiveTab('challenges')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'challenges'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Défis
          </button>
          <button
            onClick={() => setActiveTab('games')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'games'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Jeux
          </button>
        </nav>
      </div>

      <div className="pb-24">
        {activeTab === 'boosts' && <BoostsTab />}
        {activeTab === 'badges' && <BadgesTab />}
        {activeTab === 'lotteries' && <LotteriesTab />}
        {activeTab === 'challenges' && <ChallengesTab />}
        {activeTab === 'games' && <GamesTab />}
      </div>
    </div>
  );
};

