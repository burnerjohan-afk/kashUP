/**
 * Script de test pour tester l'endpoint POST /partners directement
 * Teste avec une requête HTTP réelle pour voir si le problème vient des middlewares
 */

import fetch from 'node-fetch';

const API_URL = process.env.API_URL || 'http://localhost:4000';

// Vous devez obtenir un token JWT valide depuis votre base de données
// Pour ce test, on va d'abord tester l'endpoint /partners/debug (sans auth)
async function testDebugEndpoint() {
  console.log('🧪 Test 1: Endpoint /partners/debug (sans authentification)');
  
  try {
    const formData = new FormData();
    formData.append('name', 'Test Partner Debug');
    formData.append('territories', '["martinique"]');
    formData.append('category', 'Restauration');
    formData.append('tauxCashbackBase', '5');
    
    const response = await fetch(`${API_URL}/partners/debug`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    console.log('✅ Réponse reçue:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Endpoint /partners/debug fonctionne !');
      return true;
    } else {
      console.log('❌ Endpoint /partners/debug a retourné une erreur');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
    return false;
  }
}

async function testHealthEndpoint() {
  console.log('\n🧪 Test 0: Endpoint /health (vérification de base)');
  
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Réponse /health:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));
    
    return response.ok;
  } catch (error) {
    console.error('❌ Erreur lors du test /health:', error);
    console.error('💡 Vérifiez que l\'API est démarrée avec: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 Début des tests d\'endpoints\n');
  console.log(`📍 URL de l'API: ${API_URL}\n`);
  
  // Test 0: Health check
  const healthOk = await testHealthEndpoint();
  if (!healthOk) {
    console.log('\n❌ L\'API ne répond pas. Vérifiez qu\'elle est démarrée.');
    process.exit(1);
  }
  
  // Test 1: Debug endpoint
  const debugOk = await testDebugEndpoint();
  
  console.log('\n📊 Résumé des tests:');
  console.log(`Health: ${healthOk ? '✅' : '❌'}`);
  console.log(`Debug: ${debugOk ? '✅' : '❌'}`);
  
  if (debugOk) {
    console.log('\n✅ Les endpoints répondent correctement !');
    console.log('💡 Le problème pourrait venir de:');
    console.log('   - L\'authentification (token JWT)');
    console.log('   - Le middleware Multer');
    console.log('   - Le traitement des données dans le handler');
  } else {
    console.log('\n❌ Certains endpoints ne fonctionnent pas.');
    console.log('💡 Vérifiez les logs du serveur pour plus de détails.');
  }
}

main().catch(console.error);

