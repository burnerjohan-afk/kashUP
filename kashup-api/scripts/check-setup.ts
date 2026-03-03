import prisma from '../src/config/prisma';
import env from '../src/config/env';
import logger from '../src/utils/logger';

/**
 * Script de vérification de la configuration pour la liaison Back Office ↔ Application Mobile
 */
async function checkSetup() {
  console.log('\n🔍 Vérification de la configuration...\n');

  let hasErrors = false;

  // 1. Vérifier la connexion à la base de données
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données : OK');
  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error);
    hasErrors = true;
  }

  // 2. Vérifier que la catégorie "Services" existe
  try {
    const categories = await prisma.partnerCategory.findMany();
    console.log(`✅ Catégories trouvées : ${categories.length}`);
    
    const servicesCategory = categories.find(c => c.name.toLowerCase() === 'services');
    if (servicesCategory) {
      console.log(`✅ Catégorie "Services" trouvée (ID: ${servicesCategory.id})`);
    } else {
      console.log('⚠️  Catégorie "Services" introuvable');
      console.log('   Catégories disponibles:', categories.map(c => c.name).join(', '));
      console.log('   Créez-la avec: POST /partners/categories {"name": "Services"}');
      hasErrors = true;
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des catégories:', error);
    hasErrors = true;
  }

  // 3. Vérifier la configuration du webhook
  if (env.MOBILE_WEBHOOK_URL) {
    console.log(`✅ MOBILE_WEBHOOK_URL configuré : ${env.MOBILE_WEBHOOK_URL}`);
  } else {
    console.log('⚠️  MOBILE_WEBHOOK_URL non configuré');
    console.log('   Les webhooks ne seront pas émis vers l\'application mobile');
    console.log('   Ajoutez dans .env : MOBILE_WEBHOOK_URL=https://votre-app-mobile.com/api/webhooks');
  }

  // 4. Vérifier les variables d'environnement essentielles
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`✅ ${varName} : Configuré`);
    } else {
      console.error(`❌ ${varName} : Manquant`);
      hasErrors = true;
    }
  }

  // 5. Résumé
  console.log('\n' + '='.repeat(50));
  if (hasErrors) {
    console.log('❌ Des erreurs ont été détectées. Corrigez-les avant de continuer.');
  } else {
    console.log('✅ Configuration OK ! La liaison Back Office ↔ Application Mobile est prête.');
  }
  console.log('='.repeat(50) + '\n');

  await prisma.$disconnect();
  process.exit(hasErrors ? 1 : 0);
}

checkSetup().catch((error) => {
  console.error('Erreur fatale:', error);
  process.exit(1);
});

