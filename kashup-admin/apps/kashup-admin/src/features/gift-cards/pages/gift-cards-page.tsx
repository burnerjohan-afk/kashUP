import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { CartesUpPage } from './cartes-up-page';
import { BoxUpPage } from './box-up-page';

export const GiftCardsPage = () => {
  const [activeTab, setActiveTab] = useState<'cartes-up' | 'box-up'>('cartes-up');

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink">Carte et coffret cadeau</h1>
          <p className="text-sm text-ink/50">Gestion des cartes cadeaux et boxes</p>
        </div>
      </div>

      <div className="mb-6 border-b border-ink/10">
        <nav className="flex flex-wrap gap-2 sm:gap-4">
          <button
            onClick={() => setActiveTab('cartes-up')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'cartes-up'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Cartes UP
          </button>
          <button
            onClick={() => setActiveTab('box-up')}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'box-up'
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink/50 hover:text-ink',
            )}
          >
            Box UP
          </button>
        </nav>
      </div>

      {activeTab === 'cartes-up' && <CartesUpPage />}

      {activeTab === 'box-up' && <BoxUpPage />}
    </div>
  );
};

