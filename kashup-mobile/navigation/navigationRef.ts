import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

/**
 * Navigation vers un écran du stack racine (utilisable depuis n'importe quel écran).
 * Ex. : navigateToOffresDuMoment() depuis la page d'accueil.
 */
export function navigateToOffresDuMoment() {
  if (navigationRef.isReady()) {
    navigationRef.navigate('Tabs', {
      screen: 'Partenaires',
      params: { screen: 'OffresDuMoment' },
    });
  }
}
