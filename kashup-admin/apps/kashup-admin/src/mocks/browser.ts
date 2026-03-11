import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

const worker = setupWorker(...handlers);

export const startWorker = async () => {
  const enabled = import.meta.env.VITE_ENABLE_MSW === 'true' && import.meta.env.DEV;
  if (!enabled) {
    if (import.meta.env.DEV) {
      console.info('⏹️ MSW désactivé (VITE_ENABLE_MSW !== "true"). Aucune interception.');
    }
    return;
  }

  await worker.start({
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
    // Ne rien intercepter par défaut au-delà des handlers déclarés
    onUnhandledRequest: 'bypass',
  });

  if (import.meta.env.DEV) {
    console.log('✅ MSW activé - données mock uniquement en DEV et si VITE_ENABLE_MSW="true"');
  }
};


