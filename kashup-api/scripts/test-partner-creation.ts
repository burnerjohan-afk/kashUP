/**
 * Script de test pour créer un partenaire directement
 * Utilisez ce script pour tester la création d'un partenaire sans passer par le frontend
 */

import prisma from '../src/config/prisma';
import { createPartner } from '../src/services/partner.service';
import logger from '../src/utils/logger';

async function testPartnerCreation() {
  try {
    logger.info('🧪 Début du test de création de partenaire');

    // Récupérer une catégorie existante
    const categories = await prisma.partnerCategory.findMany();
    if (categories.length === 0) {
      logger.error('❌ Aucune catégorie trouvée dans la base de données');
      logger.info('💡 Créez d\'abord une catégorie avec: npm run prisma:seed');
      process.exit(1);
    }

    const category = categories[0];
    logger.info({ categoryId: category.id, categoryName: category.name }, '✅ Catégorie trouvée');

    // Données de test
    const testData = {
      name: 'Test Partner ' + Date.now(),
      categoryId: category.id,
      territory: 'Martinique' as const,
      tauxCashbackBase: 5,
      boostable: true
    };

    logger.info({ testData }, '📋 Données de test préparées');

    // Tenter de créer le partenaire
    logger.info('🔄 Création du partenaire...');
    const partner = await createPartner(testData);

    logger.info({ 
      partnerId: partner.id,
      partnerName: partner.name 
    }, '✅ Partenaire créé avec succès !');

    // Nettoyer : supprimer le partenaire de test
    logger.info('🧹 Nettoyage : suppression du partenaire de test...');
    await prisma.partner.delete({ where: { id: partner.id } });
    logger.info('✅ Partenaire de test supprimé');

    logger.info('✅ Test réussi ! Le service createPartner fonctionne correctement.');
    process.exit(0);
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.constructor.name : typeof error
    }, '❌ Erreur lors du test');

    // Vérifier si c'est une erreur Prisma
    if (error && typeof error === 'object' && 'code' in error) {
      logger.error({
        prismaCode: (error as any).code,
        prismaMeta: (error as any).meta
      }, '❌ Erreur Prisma détectée');
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testPartnerCreation();

