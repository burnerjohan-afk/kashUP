import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers/app-providers';
import { AppRouter } from '@/app/router/app-router';
import { initializeApiBaseUrl } from '@/lib/api/kashup-client';
import './styles/global.css';
import './locales';

const cleanupMockServiceWorker = async () => {
  // Empêche un service worker MSW déjà installé de continuer à intercepter
  if (!('serviceWorker' in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    const mswRegistrations = registrations.filter((registration) => {
      const scriptUrl = registration.active?.scriptURL ?? registration.installing?.scriptURL ?? registration.waiting?.scriptURL;
      return scriptUrl?.includes('mockServiceWorker.js');
    });

    await Promise.all(mswRegistrations.map((registration) => registration.unregister()));

    // Nettoyer les caches éventuellement créés par MSW
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.includes('msw') || key.includes('mockServiceWorker'))
          .map((key) => caches.delete(key)),
      );
    }

    if (import.meta.env.DEV) {
      console.info('🧹 Service worker MSW supprimé (VITE_ENABLE_MSW !== "true").');
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Impossible de nettoyer le service worker MSW:', error);
    }
  }
};

// Gestionnaire d'erreurs global pour ignorer les erreurs non bloquantes
const setupGlobalErrorHandlers = () => {
  // Ignorer les erreurs Google Translate (non bloquantes)
  window.addEventListener('error', (event) => {
    const message = event.message || '';
    const filename = event.filename || '';
    const errorMessage = event.error?.message || '';

    // Ignorer les erreurs Google Translate
    if (
      message.includes('translate-pa.googleapis.com') ||
      filename.includes('translate') ||
      errorMessage.includes('translate')
    ) {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.debug('🌐 Erreur Google Translate ignorée (non bloquante)');
      }
      return false;
    }

    // Ignorer les erreurs Prisma Studio (port 5556) - polices manquantes
    if (
      filename.includes('localhost:5556') ||
      filename.includes(':5556') ||
      message.includes('localhost:5556') ||
      message.includes(':5556') ||
      message.includes('.woff') ||
      message.includes('.woff2')
    ) {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.debug('🔧 Erreur Prisma Studio ignorée (non bloquante)');
      }
      return false;
    }

    // Ignorer les erreurs d'outils de développement (Prisma Studio, etc.)
    if (
      message.includes('sidebarData.data is not observable') ||
      message.includes('ensureIndexVisible') ||
      message.includes('Count request failed for model')
    ) {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.debug('🔧 Erreur outil de développement ignorée (non bloquante)');
      }
      return false;
    }
  });

  // Ignorer les erreurs de réseau non bloquantes dans les promesses
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const errorMessage = error?.message || String(error);
    const errorUrl = error?.url || error?.config?.url || '';

    // Ignorer les erreurs Google Translate
    if (
      errorMessage.includes('translate-pa.googleapis.com') ||
      errorUrl.includes('translate-pa.googleapis.com') ||
      errorMessage.includes('ERR_NETWORK_CHANGED') ||
      (error?.code === 'ERR_NETWORK_CHANGED' && errorUrl.includes('translate'))
    ) {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.debug('🌐 Erreur réseau Google Translate ignorée (non bloquante)');
      }
      return false;
    }

    // Ignorer les erreurs Prisma Studio
    if (
      errorUrl.includes('localhost:5556') ||
      errorUrl.includes(':5556') ||
      errorMessage.includes('localhost:5556') ||
      errorMessage.includes(':5556') ||
      errorMessage.includes('Count request failed for model') ||
      errorMessage.includes('sidebarData') ||
      errorMessage.includes('ensureIndexVisible')
    ) {
      event.preventDefault();
      if (import.meta.env.DEV) {
        console.debug('🔧 Erreur Prisma Studio ignorée (non bloquante)');
      }
      return false;
    }
  });
};

const prepareApp = async () => {
  // Configurer les gestionnaires d'erreurs globaux
  setupGlobalErrorHandlers();

  // ⚠️ ARCHITECTURE: Initialiser la détection dynamique de l'IP LAN
  // Doit être fait avant toute requête API
  try {
    await initializeApiBaseUrl();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('⚠️ Échec de l\'initialisation de l\'URL API, utilisation du fallback:', error);
    }
  }

  const shouldEnableMsw = import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true';

  if (shouldEnableMsw) {
    const { startWorker } = await import('./mocks/browser');
    await startWorker();
  } else {
    await cleanupMockServiceWorker();
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <AppProviders>
      <AppRouter />
    </AppProviders>,
  );
};

void prepareApp();

