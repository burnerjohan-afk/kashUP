/**
 * Point d'entrée simple pour lancer le diagnostic API
 * Utilisation: Appelez cette fonction depuis la console ou un bouton
 */

import { runFullDiagnostics } from './apiDiagnostics';

/**
 * Lance le diagnostic complet et affiche les résultats dans la console
 * 
 * Exemple d'utilisation:
 * - Depuis la console React Native: Appeler directement `runDiagnostics()`
 * - Depuis un composant: `import { runDiagnostics } from '@/src/utils/runDiagnostics';`
 */
export async function runDiagnostics() {
  console.log('\n🚀 Lancement du diagnostic API...\n');
  try {
    const results = await runFullDiagnostics();
    return results;
  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
    throw error;
  }
}

// Exporter pour utilisation globale en développement
if (__DEV__ && typeof global !== 'undefined') {
  (global as any).runDiagnostics = runDiagnostics;
  console.log('💡 Diagnostic API disponible: Appelez runDiagnostics() depuis la console');
}

