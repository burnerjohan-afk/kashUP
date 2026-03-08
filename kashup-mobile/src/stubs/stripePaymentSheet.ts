/**
 * Stub pour usePaymentSheet (Stripe temporairement désactivé).
 * Remplace @stripe/stripe-react-native pour permettre le build EAS sans la dépendance Stripe.
 * Quand Stripe sera réactivé : supprimer ce fichier et réimporter depuis '@stripe/stripe-react-native'.
 */
import { Alert } from 'react-native';

const STUB_MESSAGE = 'Paiement temporairement indisponible. Réessayez plus tard.';

export function usePaymentSheet() {
  return {
    initPaymentSheet: async (_params: { paymentIntentClientSecret: string; merchantDisplayName: string }) => ({
      error: { message: STUB_MESSAGE },
    }),
    presentPaymentSheet: async () => {
      Alert.alert('Indisponible', STUB_MESSAGE);
      return { error: { message: STUB_MESSAGE } };
    },
  };
}
