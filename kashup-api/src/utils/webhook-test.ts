/**
 * Script de test pour vérifier la configuration des webhooks
 * Usage: npx ts-node src/utils/webhook-test.ts
 */

import env from '../config/env';
import { emitWebhook } from '../services/webhook.service';
import logger from './logger';

async function testWebhook() {
  console.log('\n🧪 Test de configuration des webhooks\n');
  
  // Vérifier la configuration
  if (!env.MOBILE_WEBHOOK_URL) {
    console.log('❌ MOBILE_WEBHOOK_URL n\'est pas configuré dans .env');
    console.log('   Ajoutez: MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks\n');
    process.exit(1);
  }

  console.log(`✅ URL configurée: ${env.MOBILE_WEBHOOK_URL}\n`);
  console.log('📤 Envoi d\'un webhook de test...\n');

  // Envoyer un webhook de test
  try {
    await emitWebhook('test.ping', {
      message: 'Ceci est un webhook de test depuis KashUP API',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

    console.log('✅ Webhook envoyé avec succès !');
    console.log('   Vérifiez les logs de votre application mobile pour confirmer la réception.\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du webhook:', error);
    console.log('\n💡 Vérifiez que:');
    console.log('   - L\'URL est correcte et accessible');
    console.log('   - L\'application mobile écoute sur cet endpoint');
    console.log('   - Le firewall/autorisations réseau permettent la connexion\n');
    process.exit(1);
  }
}

// Exécuter le test
testWebhook().catch((error) => {
  logger.error({ error }, 'Erreur dans le test de webhook');
  process.exit(1);
});

