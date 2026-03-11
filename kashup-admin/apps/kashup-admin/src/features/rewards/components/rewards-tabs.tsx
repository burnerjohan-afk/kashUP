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
    <div className="min-w-0">
      <div className="mb-6 border-b border-ink/10">
        <nav className="flex flex-wrap gap-2 sm:gap-4">
          {(['boosts', 'badges', 'lotteries', 'challenges', 'games'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors sm:px-4',
                activeTab === tab
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-ink/50 hover:text-ink',
              )}
            >
              {tab === 'boosts' && 'Boosts'}
              {tab === 'badges' && 'Badges'}
              {tab === 'lotteries' && 'Loteries'}
              {tab === 'challenges' && 'Défis'}
              {tab === 'games' && 'Jeux'}
            </button>
          ))}
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

