import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from './constants/theme';
import { AuthProvider } from './context/AuthContext';
import { NotificationsProvider } from './context/NotificationsContext';
import MainStack from './navigation/MainStack';
import { useAppSync } from './src/hooks/useAppSync';
import {
  PersistQueryClientProvider,
  asyncStoragePersister,
  queryClient,
} from './src/lib/queryClient';
import { registerPushToken } from './src/services/notificationTokenService';
import { setupWebhookNotifications } from './src/services/webhookNotificationService';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.slateBackground,
    card: colors.slateBackground,
    text: colors.textMain,
    border: colors.greyBorder,
    notification: colors.primary,
  },
};

function AppContent() {
  // Synchronisation au démarrage de l'app
  useAppSync();

  useEffect(() => {
    // Test de connexion API au démarrage (en dev uniquement)
    if (__DEV__) {
      import('./src/utils/testApiConnection').then(({ testApiConnection }) => {
        setTimeout(() => {
          testApiConnection().catch(console.error);
        }, 2000); // Attendre 2 secondes après le démarrage
      });
    }
  }, []);

  useEffect(() => {
    // Initialiser les notifications webhook au démarrage de l'app
    // Utiliser un délai pour ne pas bloquer le rendu initial
    const initWebhookNotifications = async () => {
      try {
        // Attendre un peu pour laisser l'app se charger
        await new Promise((resolve) => setTimeout(resolve, 2000));
        
        const token = await setupWebhookNotifications();
        if (token) {
          // Enregistrer le token auprès du backend (ne bloque pas si l'API n'est pas disponible)
          registerPushToken(token).catch((error) => {
            console.warn('[App] Impossible d\'enregistrer le token push (API peut-être indisponible):', error.message);
          });
        }
      } catch (error) {
        console.error('[App] Erreur lors de l\'initialisation des notifications webhook:', error);
        // Ne pas bloquer l'application si les notifications échouent
      }
    };

    initWebhookNotifications();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navTheme}>
        <AuthProvider>
          <NotificationsProvider>
            <StatusBar style="dark" />
            <MainStack />
          </NotificationsProvider>
        </AuthProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}>
      <AppContent />
    </PersistQueryClientProvider>
  );
}

