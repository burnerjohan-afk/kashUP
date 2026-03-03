/**
 * Outil de diagnostic pour les problèmes de connexion API
 * Aide à identifier les causes des timeouts et erreurs de connexion
 */

import { apiOrigin, apiBaseUrl } from '../config/runtime';
import { api } from '../services/api';
import axios from 'axios';

export interface DiagnosticResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  duration?: number;
}

/**
 * Teste la connectivité réseau de base (ping)
 */
export async function testNetworkConnectivity(): Promise<DiagnosticResult> {
  const startTime = Date.now();
  try {
    const origin = apiOrigin;
    const host = origin.replace('http://', '').replace(':4000', '');
    
    // Test simple de résolution DNS et connectivité
    const response = await axios.get(`${origin}/health`, {
      timeout: 5000, // Timeout court pour le test
      validateStatus: () => true, // Accepter tous les codes de statut
    });
    
    const duration = Date.now() - startTime;
    
    return {
      test: 'Connectivité réseau',
      success: response.status < 500, // 2xx, 3xx, 4xx = serveur répond
      message: response.status < 500 
        ? `Serveur accessible (${response.status} en ${duration}ms)`
        : `Serveur inaccessible (${response.status})`,
      details: {
        status: response.status,
        host,
      },
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    const isNetworkError = error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND';
    
    return {
      test: 'Connectivité réseau',
      success: false,
      message: isTimeout 
        ? `Timeout après ${duration}ms - Le serveur ne répond pas`
        : isNetworkError
        ? `Connexion refusée - Le serveur n'est probablement pas démarré`
        : `Erreur réseau: ${error.message}`,
      details: {
        error: error.message,
        code: error.code,
      },
      duration,
    };
  }
}

/**
 * Teste l'endpoint /health de l'API
 */
export async function testHealthEndpoint(): Promise<DiagnosticResult> {
  const startTime = Date.now();
  try {
    const response = await api.get('/health', {
      timeout: 10000,
    });
    
    const duration = Date.now() - startTime;
    
    return {
      test: 'Endpoint /health',
      success: true,
      message: `Health check réussi (${duration}ms)`,
      details: response.data,
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    
    return {
      test: 'Endpoint /health',
      success: false,
      message: isTimeout 
        ? `Timeout après ${duration}ms`
        : `Erreur: ${error.message}`,
      details: {
        error: error.message,
        code: error.code,
      },
      duration,
    };
  }
}

/**
 * Teste un endpoint spécifique
 */
export async function testEndpoint(
  endpoint: string,
  timeout: number = 10000
): Promise<DiagnosticResult> {
  const startTime = Date.now();
  try {
    const response = await api.get(endpoint, {
      timeout,
      validateStatus: () => true, // Accepter tous les codes
    });
    
    const duration = Date.now() - startTime;
    
    return {
      test: `Endpoint ${endpoint}`,
      success: response.status < 500,
      message: `Réponse ${response.status} en ${duration}ms`,
      details: {
        status: response.status,
        hasData: !!response.data,
      },
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    
    return {
      test: `Endpoint ${endpoint}`,
      success: false,
      message: isTimeout 
        ? `Timeout après ${duration}ms`
        : `Erreur: ${error.message}`,
      details: {
        error: error.message,
        code: error.code,
      },
      duration,
    };
  }
}

/**
 * Vérifie la configuration API
 */
export function checkApiConfiguration(): DiagnosticResult {
  const config = {
    apiOrigin,
    apiBaseUrl,
    host: apiOrigin.replace('http://', '').replace(':4000', ''),
  };
  
  const isValid = apiOrigin && apiBaseUrl && !apiOrigin.includes('undefined');
  
  return {
    test: 'Configuration API',
    success: isValid,
    message: isValid 
      ? `Configuration valide: ${apiBaseUrl}`
      : 'Configuration invalide - Vérifiez runtime.ts',
    details: config,
  };
}

/**
 * Teste la vitesse de réponse du serveur
 */
export async function testServerResponseTime(): Promise<DiagnosticResult> {
  const startTime = Date.now();
  try {
    const origin = apiOrigin;
    await axios.get(`${origin}/health`, {
      timeout: 5000,
    });
    
    const duration = Date.now() - startTime;
    
    let performance: string;
    if (duration < 100) {
      performance = 'Excellent';
    } else if (duration < 500) {
      performance = 'Bon';
    } else if (duration < 1000) {
      performance = 'Acceptable';
    } else if (duration < 3000) {
      performance = 'Lent';
    } else {
      performance = 'Très lent';
    }
    
    return {
      test: 'Temps de réponse',
      success: duration < 5000,
      message: `${performance} (${duration}ms)`,
      details: {
        duration,
        performance,
      },
      duration,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      test: 'Temps de réponse',
      success: false,
      message: `Erreur: ${error.message}`,
      details: {
        error: error.message,
      },
      duration,
    };
  }
}

/**
 * Exécute tous les tests de diagnostic
 */
export async function runFullDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];
  
  console.log('\n🔍 === DIAGNOSTIC API ===\n');
  
  // 1. Configuration
  console.log('1️⃣  Vérification de la configuration...');
  const configResult = checkApiConfiguration();
  results.push(configResult);
  console.log(`   ${configResult.success ? '✅' : '❌'} ${configResult.message}`);
  
  if (!configResult.success) {
    console.log('\n⚠️  Configuration invalide, arrêt des tests.\n');
    return results;
  }
  
  // 2. Connectivité réseau
  console.log('\n2️⃣  Test de connectivité réseau...');
  const networkResult = await testNetworkConnectivity();
  results.push(networkResult);
  console.log(`   ${networkResult.success ? '✅' : '❌'} ${networkResult.message}`);
  if (networkResult.duration) {
    console.log(`   ⏱️  Durée: ${networkResult.duration}ms`);
  }
  
  // 3. Temps de réponse
  console.log('\n3️⃣  Test du temps de réponse...');
  const responseTimeResult = await testServerResponseTime();
  results.push(responseTimeResult);
  console.log(`   ${responseTimeResult.success ? '✅' : '❌'} ${responseTimeResult.message}`);
  
  // 4. Health endpoint
  console.log('\n4️⃣  Test de l\'endpoint /health...');
  const healthResult = await testHealthEndpoint();
  results.push(healthResult);
  console.log(`   ${healthResult.success ? '✅' : '❌'} ${healthResult.message}`);
  
  // 5. Test des endpoints problématiques
  const endpointsToTest = ['/partners', '/partners/categories/list', '/me'];
  console.log('\n5️⃣  Test des endpoints spécifiques...');
  
  for (const endpoint of endpointsToTest) {
    const endpointResult = await testEndpoint(endpoint, 10000);
    results.push(endpointResult);
    console.log(`   ${endpointResult.success ? '✅' : '❌'} ${endpointResult.test}: ${endpointResult.message}`);
  }
  
  // Résumé
  console.log('\n📊 === RÉSUMÉ ===');
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`   Tests réussis: ${successCount}/${totalCount}`);
  
  if (successCount < totalCount) {
    console.log('\n⚠️  PROBLÈMES DÉTECTÉS:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   ❌ ${r.test}: ${r.message}`);
      });
    
    console.log('\n💡 SUGGESTIONS:');
    if (results.some(r => r.message.includes('Timeout'))) {
      console.log('   • Le serveur backend est peut-être arrêté ou surchargé');
      console.log('   • Vérifiez que le serveur est démarré: npm start (dans kashup-api)');
      console.log('   • Vérifiez que le port 4000 est accessible');
    }
    if (results.some(r => r.message.includes('refusée') || r.message.includes('ECONNREFUSED'))) {
      console.log('   • Le serveur backend n\'est pas démarré');
      console.log('   • Démarrez le serveur: cd kashup-api && npm start');
    }
    if (results.some(r => r.duration && r.duration > 3000)) {
      console.log('   • Le serveur répond mais très lentement');
      console.log('   • Vérifiez les performances du serveur backend');
      console.log('   • Vérifiez la connexion réseau');
    }
  } else {
    console.log('\n✅ Tous les tests sont passés avec succès!');
  }
  
  console.log('\n');
  
  return results;
}

