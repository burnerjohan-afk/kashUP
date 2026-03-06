import { Router } from 'express';
import {
  createCategoryHandler,
  createPartnerHandler,
  deleteCategoryHandler,
  deletePartnerDocumentHandler,
  deletePartnerHandler,
  getCategories,
  getPartnerById,
  getPartnerDocumentsHandler,
  getPartners,
  getPartnerStatisticsHandler,
  listPartnerTerritoriesHandler,
  updateCategoryHandler,
  uploadPartnerDocumentHandler,
  updatePartnerHandler
} from '../controllers/partner.controller';
import { authMiddleware, requireRoles } from '../middlewares/auth';
import { validateBody, validateQuery } from '../middlewares/validator';
import { categorySchema, createPartnerSchema, partnerFiltersSchema, updatePartnerSchema } from '../schemas/partner.schema';
import { USER_ROLE } from '../types/domain';
import { uploadDocumentSingle, uploadFields } from '../config/upload';
import logger from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';

const router = Router();

// Endpoint de debug SANS authentification pour voir ce qui arrive
router.post('/debug', (req, res) => {
  console.log('=== DEBUG ENDPOINT ===');
  console.log('Method:', req.method);
  console.log('Path:', req.path);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Files:', req.files);
  console.log('Body keys:', Object.keys(req.body || {}));
  
  logger.info({
    method: req.method,
    path: req.path,
    headers: req.headers,
    body: req.body,
    files: req.files,
    bodyKeys: Object.keys(req.body || {})
  }, '🔍 Debug endpoint appelé');
  
  res.json({
    success: true,
    message: 'Endpoint de debug fonctionne',
    body: req.body,
    files: req.files ? Object.keys(req.files) : 'no files',
    bodyKeys: Object.keys(req.body || {}),
    contentType: req.headers['content-type']
  });
});

// Endpoint de test pour vérifier que la route fonctionne
router.post('/test', (req, res) => {
  res.json({
    message: 'Route de test fonctionnelle',
    body: req.body,
    files: req.files ? Object.keys(req.files) : 'no files',
    hasAuth: !!req.headers.authorization
  });
});

// Endpoint de test pour vérifier que la route fonctionne
router.get('/test', (_req, res) => {
  res.json({ ok: true, message: 'Route /partners/test fonctionnelle' });
});

// GET /partners - Liste des partenaires avec filtres optionnels
// La validation est faite dans le contrôleur pour une meilleure gestion des erreurs
router.get('/', getPartners);

// GET /partners/test - Endpoint de test pour vérifier la structure de réponse
router.get('/test', (req, res) => {
  res.json({
    message: 'Endpoint de test - Structure de réponse attendue',
    expectedStructure: {
      statusCode: 200,
      success: true,
      message: 'Liste des partenaires récupérée avec succès',
      data: {
        partners: [
          {
            id: 'string',
            name: 'string',
            category: { id: 'string | null', name: 'string' },
            logoUrl: 'string | null (URL absolue)',
            // ... autres champs
          }
        ]
      },
      meta: {
        pagination: {
          page: 1,
          pageSize: 20,
          total: 0,
          totalPages: 0
        }
      }
    },
    note: 'Utiliser GET /partners pour obtenir les données réelles'
  });
});

// GET /partners/debug - Endpoint de debug pour voir les données brutes
router.get('/debug', asyncHandler(async (req, res) => {
  const prisma = (await import('../config/prisma')).default;
  
  // Récupérer les partenaires directement depuis Prisma (sans filtres, sans sérialisation)
  const rawPartners = await prisma.partner.findMany({
    take: 5, // Limiter à 5 pour le debug
    include: {
      category: { select: { id: true, name: true } }
    }
  });
  
  // Compter le total
  const total = await prisma.partner.count();
  
  res.json({
    debug: true,
    message: 'Données brutes depuis Prisma (sans filtres, sans sérialisation)',
    totalInDb: total,
    sampleCount: rawPartners.length,
    samplePartners: rawPartners.map(p => ({
      id: p.id,
      name: p.name,
      status: p.status,
      categoryId: p.categoryId,
      category: p.category,
      hasLogoUrl: !!p.logoUrl,
      logoUrl: p.logoUrl,
      territories: p.territories,
      createdAt: p.createdAt
    })),
    note: 'Ces données sont brutes. Les données réelles passent par formatPartnerResponse et serializePartner'
  });
}));

router.get('/categories', getCategories);
router.get('/categories/list', getCategories); // alias legacy
router.get('/territories', listPartnerTerritoriesHandler);
router.post('/categories', authMiddleware, requireRoles(USER_ROLE.admin), validateBody(categorySchema), createCategoryHandler);
router.patch('/categories/:id', authMiddleware, requireRoles(USER_ROLE.admin), validateBody(categorySchema), updateCategoryHandler);
router.delete('/categories/:id', authMiddleware, requireRoles(USER_ROLE.admin), deleteCategoryHandler);

router.get('/:id', getPartnerById);
router.get('/:id/statistics', authMiddleware, requireRoles(USER_ROLE.admin), getPartnerStatisticsHandler);
router.get('/:id/documents', authMiddleware, requireRoles(USER_ROLE.admin), getPartnerDocumentsHandler);
router.post('/:id/documents', authMiddleware, requireRoles(USER_ROLE.admin), uploadDocumentSingle(), uploadPartnerDocumentHandler);
router.delete('/:id/documents/:documentId', authMiddleware, requireRoles(USER_ROLE.admin), deletePartnerDocumentHandler);
router.delete('/:id', authMiddleware, requireRoles(USER_ROLE.admin), deletePartnerHandler);

// Endpoint simplifié pour créer un partenaire avec JSON (sans multipart)
// Utile pour tester si le problème vient de Multer
router.post(
  '/create-simple',
  authMiddleware,
  requireRoles(USER_ROLE.admin, USER_ROLE.partner),
  asyncHandler(async (req, res) => {
    logger.info('🚀 createPartnerSimple appelé');
    logger.info({ body: req.body, bodyKeys: Object.keys(req.body || {}) }, '📥 Données reçues (JSON)');
    
    try {
      // Importer le service
      const { createPartner } = await import('../services/partner.service');
      const { createPartnerSchema } = await import('../schemas/partner.schema');
      const prisma = (await import('../config/prisma')).default;
      
      // Préparer les données
      let data: any = { ...req.body };
      
      // Convertir category en categoryId si nécessaire
      if (data.category && !data.categoryId) {
        logger.info({ category: data.category }, '🔍 Recherche de la catégorie par nom');
        
        // Fonction de normalisation inline (même logique que dans le controller)
        const normalizeCategorySlug = (input: string): string => {
          let normalized = input.toLowerCase().trim();
          normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          normalized = normalized.replace(/[\s_]+/g, '-');
          normalized = normalized.replace(/[^a-z0-9-]/g, '');
          normalized = normalized.replace(/-+/g, '-');
          normalized = normalized.replace(/^-+|-+$/g, '');
          return normalized;
        };
        
        const categoryReceived = data.category;
        const categoryNormalized = normalizeCategorySlug(data.category);
        const categories = await prisma.partnerCategory.findMany();
        const categoryNames = categories.map(c => c.name);
        const categorySlugs = categoryNames.map(name => normalizeCategorySlug(name));
        
        logger.info({ 
          categoryReceived,
          categoryNormalized,
          availableCategories: categoryNames,
          availableSlugs: categorySlugs
        }, '📋 Catégories disponibles');
        
        // Chercher d'abord par correspondance exacte (slug normalisé)
        let category = categories.find(c => normalizeCategorySlug(c.name) === categoryNormalized);
        
        // Si pas trouvé, chercher par correspondance case-insensitive (pour compatibilité)
        if (!category) {
          category = categories.find(c => c.name.toLowerCase() === data.category.toLowerCase());
        }
        
        if (!category) {
          throw new AppError(`Catégorie "${categoryReceived}" introuvable`, 404, {
            code: 'CATEGORY_NOT_FOUND',
            received: categoryReceived,
            normalized: categoryNormalized,
            availableCategories: categoryNames
          });
        }
        
        data.categoryId = category.id;
        delete data.category;
        logger.info({ 
          categoryId: category.id, 
          categoryName: category.name,
          categoryReceived,
          categoryNormalized,
          matchType: normalizeCategorySlug(category.name) === categoryNormalized ? 'slug' : 'case-insensitive'
        }, '✅ Catégorie trouvée en base');
      }
      
      // Convertir les types
      if (data.tauxCashbackBase !== undefined) {
        data.tauxCashbackBase = typeof data.tauxCashbackBase === 'string' ? parseFloat(data.tauxCashbackBase) : data.tauxCashbackBase;
      }
      if (data.latitude !== undefined && data.latitude !== '') {
        data.latitude = typeof data.latitude === 'string' ? parseFloat(data.latitude) : data.latitude;
      }
      if (data.longitude !== undefined && data.longitude !== '') {
        data.longitude = typeof data.longitude === 'string' ? parseFloat(data.longitude) : data.longitude;
      }
      if (data.boostable !== undefined) {
        data.boostable = typeof data.boostable === 'string' 
          ? (data.boostable === 'true' || data.boostable === '1')
          : data.boostable;
      }
      
      // Parser marketingPrograms si c'est une string
      if (data.marketingPrograms && typeof data.marketingPrograms === 'string') {
        try {
          data.marketingPrograms = JSON.parse(data.marketingPrograms);
        } catch {
          data.marketingPrograms = undefined;
        }
      }
      
      // Normaliser le territoire
      if (data.territory) {
        const territoryStr = String(data.territory);
        data.territory = territoryStr.charAt(0).toUpperCase() + territoryStr.slice(1).toLowerCase();
      }
      
      // Parser territories si présent
      if (data.territories && !data.territory) {
        const territories = typeof data.territories === 'string' ? JSON.parse(data.territories) : data.territories;
        if (Array.isArray(territories) && territories.length > 0) {
          const territoryStr = String(territories[0]);
          data.territory = territoryStr.charAt(0).toUpperCase() + territoryStr.slice(1).toLowerCase();
        }
        delete data.territories;
      }
      
      logger.info({ processedData: data }, '📋 Données traitées');
      
      // Valider
      const validationResult = createPartnerSchema.safeParse(data);
      if (!validationResult.success) {
        logger.error({ errors: validationResult.error.flatten() }, '❌ Erreur de validation');
        throw new AppError('Données invalides', 422, {
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten()
        });
      }
      
      logger.info('✅ Validation réussie, création du partenaire');
      const partner = await createPartner(validationResult.data);
      logger.info({ partnerId: partner.id }, '✅ Partenaire créé avec succès');
      
      sendSuccess(res, partner, null, 201);
    } catch (error) {
      logger.error({
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, '❌ Erreur lors de la création simplifiée');
      
      if (error instanceof AppError) {
        throw error;
      }
      
      throw new AppError(
        error instanceof Error ? error.message : 'Erreur lors de la création du partenaire',
        500,
        {
          code: 'INTERNAL_ERROR',
          details: process.env.NODE_ENV !== 'production'
            ? {
                stack: error instanceof Error ? error.stack : undefined,
                originalError: error instanceof Error ? error.message : String(error)
              }
            : undefined
        }
      );
    }
  })
);

const partnerUploadFields = [
  { name: 'logo', maxCount: 1 },
  { name: 'kbis', maxCount: 1 },
  { name: 'menuImages', maxCount: 10 },
  { name: 'photos', maxCount: 10 },
  { name: 'giftCardImage', maxCount: 1 },
  { name: 'giftCardVirtualCardImage', maxCount: 1 },
];

router.post(
  '/',
  (req, res, next) => {
    logger.info('🔐 Middleware auth - début');
    next();
  },
  authMiddleware,
  (req, res, next) => {
    logger.info({ user: req.user ? { role: req.user.role } : 'no user' }, '✅ Middleware auth - réussi');
    next();
  },
  requireRoles(USER_ROLE.admin, USER_ROLE.partner),
  (req, res, next) => {
    logger.info('✅ Middleware requireRoles - réussi');
    next();
  },
  uploadFields(partnerUploadFields),
  (req, res, next) => {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    logger.info({
      hasFiles: !!req.files,
      fields: files ? Object.keys(files) : [],
      bodyKeys: Object.keys(req.body || {}),
    }, '✅ Middleware multer - réussi');
    next();
  },
  // Note: La validation est faite dans le handler après conversion des types
  createPartnerHandler
);

router.patch(
  '/:id',
  authMiddleware,
  requireRoles(USER_ROLE.admin, USER_ROLE.partner),
  uploadFields(partnerUploadFields),
  // Note: La validation est faite dans le handler après conversion des types
  updatePartnerHandler
);

export default router;


