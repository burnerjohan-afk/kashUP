/**
 * Script de test simple pour les webhooks (JavaScript)
 * Usage: node scripts/test-webhook.js
 */

require('dotenv/config');

const MOBILE_WEBHOOK_URL = process.env.MOBILE_WEBHOOK_URL;

if (!MOBILE_WEBHOOK_URL) {
  console.error('❌ MOBILE_WEBHOOK_URL n\'est pas configuré dans .env');
  console.log('   Ajoutez: MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks');
  process.exit(1);
}

console.log('\n🧪 Test de configuration des webhooks\n');
console.log(`✅ URL configurée: ${MOBILE_WEBHOOK_URL}\n`);
console.log('📤 Envoi d\'un webhook de test...\n');

const payload = {
  event: 'test.ping',
  timestamp: new Date().toISOString(),
  data: {
    message: 'Ceci est un webhook de test depuis KashUP API',
    version: '1.0.0'
  }
};

fetch(MOBILE_WEBHOOK_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Webhook-Source': 'kashup-api',
    'X-Webhook-Event': 'test.ping',
    'User-Agent': 'KashUP-API/1.0'
  },
  body: JSON.stringify(payload)
})
  .then(async (response) => {
    if (response.ok) {
      console.log('✅ Webhook envoyé avec succès !');
      console.log(`   Status: ${response.status}`);
      console.log('   Vérifiez les logs de votre application mobile pour confirmer la réception.\n');
    } else {
      console.error(`❌ Erreur HTTP: ${response.status} ${response.statusText}`);
      const text = await response.text();
      console.error(`   Réponse: ${text}\n`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'envoi du webhook:', error.message);
    console.log('\n💡 Vérifiez que:');
    console.log('   - L\'URL est correcte et accessible');
    console.log('   - L\'application mobile écoute sur cet endpoint');
    console.log('   - Le firewall/autorisations réseau permettent la connexion\n');
    process.exit(1);
  });

