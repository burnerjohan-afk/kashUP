import { Request, Response } from 'express';
import path from 'path';
import {
  createCategory,
  createPartner,
  createPartnerAlias,
  createPartnerDocument,
  deleteCategory,
  deletePartner,
  deletePartnerAlias,
  deletePartnerDocument,
  getPartner,
  getPartnerAliases,
  getPartnerDocuments,
  getPartnerStatistics,
  listCategories,
  listPartners,
  listPartnerTerritories,
  updateCategory,
  updatePartner
} from '../services/partner.service';
import { asyncHandler } from '../utils/asyncHandler';
import { PartnerFilterInput, createPartnerAliasSchema, createPartnerSchema, partnerFiltersSchema, updatePartnerSchema } from '../schemas/partner.schema';
import { sendSuccess } from '../utils/response';
import { getFileUrl } from '../config/upload';
import { buildAbsoluteUrl } from '../utils/network';
import { extractFiles, moveFilesToPartnerFolder, processUploadedFile, processUploadedFiles } from '../services/upload.service';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';
import { formatPartnerResponse } from '../services/partner.service';
import { parseListParams } from '../utils/listing';
import { serializePartner, serializeList } from '../utils/serializer';

/**
 * GET /partners
 * Liste des partenaires avec filtres optionnels
 * 
 * Query params acceptés (tous optionnels) :
 * - search: Recherche textuelle (nom, description)
 * - categoryId: ID de la catégorie (CUID)
 * - category: Nom de la catégorie (sera converti en categoryId)
 * - territory: Territoire ('all' pour tous, ou nom du territoire)
 * - territories: Array JSON de territoires
 * - page: Numéro de page (défaut: 1)
 * - limit: Nombre d'éléments par page (défaut: 20, max: 100)
 * - sortBy: Champ de tri (name, createdAt, updatedAt, tauxCashbackBase) (défaut: name)
 * - sortOrder: Ordre de tri (asc, desc) (défaut: desc)
 */
export const getPartners = asyncHandler(async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = (req as any).requestId || 'no-request-id';
  const userInfo = (req as any).user ? { id: (req as any).user.sub, role: (req as any).user.role } : { id: 'anonymous', role: 'none' };
  const clientIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
  
  logger.info({
    method: req.method,
    path: req.path,
    url: req.url,
    fullUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
    query: req.query,
    user: userInfo,
    requestId,
    ip: clientIp,
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin || 'none'
  }, '📥 GET /api/v1/partners - Requête reçue');
  
  try {
    // Valider et normaliser les query params avec Zod
    const validationResult = partnerFiltersSchema.safeParse(req.query);
    
    if (!validationResult.success) {
      // Erreur de validation : renvoyer 400 avec message clair
      logger.warn({
        query: req.query,
        errors: validationResult.error.flatten(),
        requestId,
        user: userInfo
      }, '❌ GET /partners - Paramètres invalides');
      
      throw new AppError('Paramètres de requête invalides', 400, {
        code: 'VALIDATION_ERROR',
        details: validationResult.error.flatten()
      });
    }

    const filters = validationResult.data;
    
    logger.debug({
      filters,
      requestId,
      user: userInfo
    }, '🔍 GET /partners - Filtres validés');

    // Si category (nom) est fourni, le convertir en categoryId
    if (filters.category && !filters.categoryId) {
      try {
        const prismaClient = (await import('../config/prisma')).default;
        const categories = await prismaClient.partnerCategory.findMany();
        const categoryNormalized = normalizeCategorySlug(filters.category);
        
        // Chercher d'abord par correspondance exacte (slug normalisé)
        let category = categories.find(
          (c: { name: string }) => normalizeCategorySlug(c.name) === categoryNormalized
        );
        
        // Si pas trouvé, chercher par correspondance case-insensitive (pour compatibilité)
        if (!category) {
          category = categories.find(
            (c: { name: string }) => c.name.toLowerCase() === filters.category!.toLowerCase()
          );
        }
        
        if (category) {
          filters.categoryId = category.id;
          logger.info({ 
            categoryReceived: filters.category,
            categoryNormalized,
            categoryId: category.id,
            categoryName: category.name
          }, '✅ Catégorie trouvée pour filtre');
        }
        // Si la catégorie n'est pas trouvée, on continue sans filtre (ne pas bloquer)
      } catch (error) {
        // Logger l'erreur mais ne pas bloquer la requête
        logger.warn({ category: filters.category, error }, 'Erreur lors de la recherche de catégorie par nom');
      }
    }

    const listParams = parseListParams(req.query, { defaultPageSize: filters.pageSize ?? 50 });
    
    logger.debug({
      listParams,
      filters,
      requestId,
      user: userInfo
    }, '🔍 GET /partners - Appel à listPartners');
    
    const result = await listPartners(filters, listParams);
    
    const duration = Date.now() - startTime;
    
    logger.info({
      partnersCount: result.data.length,
      total: result.meta.total,
      page: result.meta.page,
      pageSize: result.meta.pageSize,
      filters,
      duration: `${duration}ms`,
      requestId,
      user: userInfo,
      resultStructure: {
        hasData: !!result.data,
        dataIsArray: Array.isArray(result.data),
        dataLength: result.data?.length || 0,
        hasMeta: !!result.meta,
        metaTotal: result.meta?.total || 0
      }
    }, `✅ GET /partners - ${result.data.length} partenaires retournés en ${duration}ms`);
    
    // Log détaillé si aucun partenaire n'est retourné
    if (result.data.length === 0) {
      logger.warn({
        filters,
        listParams,
        total: result.meta.total,
        requestId,
        user: userInfo
      }, '⚠️ GET /partners - Aucun partenaire retourné (vérifier les filtres et la base de données)');
    }

    // Vérifier que result.data est bien un array
    if (!Array.isArray(result.data)) {
      logger.error({
        resultDataType: typeof result.data,
        resultData: result.data,
        requestId
      }, '❌ GET /partners - result.data n\'est pas un array');
      throw new AppError('Format de données invalide', 500, {
        code: 'INVALID_DATA_FORMAT'
      });
    }

    // Sérialiser les partenaires selon le contexte (public vs admin)
    const serializedPartners = serializeList(req, result.data, 'partner');
    
    // Vérifier que la sérialisation a réussi
    if (!Array.isArray(serializedPartners)) {
      logger.error({
        serializedPartnersType: typeof serializedPartners,
        serializedPartners,
        requestId
      }, '❌ GET /partners - serializedPartners n\'est pas un array');
      throw new AppError('Erreur de sérialisation', 500, {
        code: 'SERIALIZATION_ERROR'
      });
    }
    
    logger.debug({
      partnersCount: serializedPartners.length,
      firstPartner: serializedPartners[0] ? {
        id: serializedPartners[0].id,
        name: serializedPartners[0].name,
        hasCategory: !!serializedPartners[0].category,
        categoryName: serializedPartners[0].category?.name,
        hasLogoUrl: !!serializedPartners[0].logoUrl,
        categoryType: typeof serializedPartners[0].category
      } : null,
      serializedStructure: {
        isArray: Array.isArray(serializedPartners),
        length: serializedPartners.length,
        hasPartners: serializedPartners.length > 0
      },
      requestId,
      user: userInfo
    }, '🔍 Partenaires sérialisés avant envoi');
    
    // Structure de réponse : { partners: [...] } dans data (toujours un tableau pour le mobile)
    const responseData = { partners: Array.isArray(serializedPartners) ? serializedPartners : [] };
    
    logger.debug({
      responseDataStructure: {
        hasPartners: 'partners' in responseData,
        partnersIsArray: Array.isArray(responseData.partners),
        partnersCount: responseData.partners?.length || 0,
        firstPartnerId: responseData.partners?.[0]?.id
      },
      requestId
    }, '🔍 Structure de réponse finale');
    
    sendSuccess(
      res,
      responseData,
      { pagination: result.meta },
      200,
      'Liste des partenaires récupérée avec succès'
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Logger l'erreur de manière structurée
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      query: req.query,
      path: req.path,
      url: req.url,
      duration: `${duration}ms`,
      requestId,
      user: userInfo
    }, '❌ GET /partners - Erreur lors de la récupération des partenaires');

    // Si c'est déjà une AppError, la propager (elle sera gérée par le middleware)
    if (error instanceof AppError) {
      throw error;
    }

    // Sinon, créer une erreur générique 500 (sans exposer la stack au client)
    throw new AppError('Erreur lors de la récupération des partenaires', 500, {
      code: 'INTERNAL_ERROR'
    });
  }
});

export const getPartnerById = asyncHandler(async (req: Request, res: Response) => {
  const partner = await getPartner(req.params.id);
  // Sérialiser le partenaire selon le contexte (public vs admin) avec transformation des URLs
  const serialized = serializePartner(req, partner);
  sendSuccess(res, serialized, null, 200, 'Partenaire récupéré avec succès');
});

/**
 * Parse une chaîne JSON en tableau avec gestion d'erreur
 */
const parseJsonArray = (value: string | undefined, fieldName: string): any[] | undefined => {
  if (!value || value === '') return undefined;
  
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (!Array.isArray(parsed)) {
        logger.warn({ fieldName, value, parsed }, `Le champ ${fieldName} n'est pas un tableau après parsing`);
        return undefined;
      }
      return parsed;
    } catch (error) {
      logger.warn({ fieldName, value, error: (error as Error).message }, `Erreur lors du parsing JSON de ${fieldName}`);
      return undefined;
    }
  }
  
  return Array.isArray(value) ? value : undefined;
};

/**
 * Normalise un nom de catégorie en slug :
 * - lowercase
 * - suppression des accents
 * - remplacement des espaces par "-"
 * - suppression des caractères spéciaux
 */
const normalizeCategorySlug = (input: string): string => {
  // Convertir en minuscule
  let normalized = input.toLowerCase().trim();
  
  // Supprimer les accents
  normalized = normalized
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  // Remplacer les espaces et underscores par des tirets
  normalized = normalized.replace(/[\s_]+/g, '-');
  
  // Supprimer les caractères non alphanumériques sauf les tirets
  normalized = normalized.replace(/[^a-z0-9-]/g, '');
  
  // Supprimer les tirets multiples
  normalized = normalized.replace(/-+/g, '-');
  
  // Supprimer les tirets en début et fin
  normalized = normalized.replace(/^-+|-+$/g, '');
  
  return normalized;
};

/**
 * Trouve une catégorie par son nom (slug ou label UI) et retourne son ID
 * Accepte les slugs normalisés (ex: "loisir") ou les labels UI (ex: "Loisir")
 */
const findCategoryIdByName = async (categoryName: string): Promise<string> => {
  try {
    const categoryReceived = categoryName;
    const categoryNormalized = normalizeCategorySlug(categoryName);
    
    logger.info({ 
      categoryReceived, 
      categoryNormalized 
    }, '🔍 Recherche de la catégorie par nom');
    
    // SQLite ne supporte pas mode: 'insensitive', donc on récupère toutes les catégories et on compare
    const prismaClient = (await import('../config/prisma')).default;
    const categories = await prismaClient.partnerCategory.findMany();
    const categoryNames = categories.map((c: { name: string }) => c.name);
    const categorySlugs = categoryNames.map((name: string) => normalizeCategorySlug(name));
    
    logger.info({ 
      categoriesCount: categories.length, 
      categoryNames,
      categorySlugs
    }, '📋 Catégories disponibles en base');
    
    // Chercher d'abord par correspondance exacte (slug normalisé)
    let category = categories.find(
      (cat: { name: string }) => normalizeCategorySlug(cat.name) === categoryNormalized
    );
    
    // Si pas trouvé, chercher par correspondance case-insensitive (pour compatibilité)
    if (!category) {
      category = categories.find(
        (cat: { name: string }) => cat.name.toLowerCase() === categoryName.toLowerCase()
      );
    }
    
    if (!category) {
      logger.error({ 
        categoryReceived, 
        categoryNormalized,
        availableCategories: categoryNames,
        availableSlugs: categorySlugs
      }, '❌ Catégorie introuvable');
      
      throw new AppError(`Catégorie "${categoryReceived}" introuvable`, 404, {
        code: 'CATEGORY_NOT_FOUND',
        received: categoryReceived,
        normalized: categoryNormalized,
        availableCategories: categoryNames
      });
    }
    
    logger.info({ 
      categoryId: category.id, 
      categoryName: category.name,
      categoryReceived,
      categoryNormalized,
      matchType: normalizeCategorySlug(category.name) === categoryNormalized ? 'slug' : 'case-insensitive'
    }, '✅ Catégorie trouvée en base');
    
    return category.id;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error({ 
      error: error instanceof Error ? error.message : String(error),
      categoryName 
    }, '❌ Erreur lors de la recherche de catégorie');
    throw new AppError(`Erreur lors de la recherche de la catégorie "${categoryName}"`, 500, {
      code: 'CATEGORY_SEARCH_ERROR',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Convertit les valeurs string en types appropriés pour multipart/form-data
 */
const processFormData = async (data: any): Promise<any> => {
  // Logger tous les champs reçus pour diagnostic
  logger.debug({ 
    receivedFields: Object.keys(data),
    receivedData: Object.entries(data).reduce((acc, [key, value]) => {
      // Tronquer les valeurs longues pour les logs
      if (typeof value === 'string' && value.length > 100) {
        acc[key] = value.substring(0, 100) + '...';
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any)
  }, '📥 Données reçues dans processFormData');
  
  const processed: any = { ...data };

  // Gérer category vs categories vs categoryId
  // Le frontend peut envoyer "category" (string) ou "categories" (array JSON stringifié)
  if (processed.categories && !processed.categoryId) {
    // Parser categories si c'est une string JSON
    const categoriesArray = parseJsonArray(processed.categories, 'categories');
    if (categoriesArray && categoriesArray.length > 0) {
      // Prendre la première catégorie
      const firstCategory = categoriesArray[0];
      logger.info({ categories: categoriesArray, firstCategory }, '🔄 Conversion categories -> categoryId');
      processed.categoryId = await findCategoryIdByName(String(firstCategory));
      delete processed.categories;
    }
  }
  
  if (processed.category && !processed.categoryId) {
    logger.info({ category: processed.category }, '🔄 Conversion category -> categoryId');
    processed.categoryId = await findCategoryIdByName(processed.category);
    delete processed.category; // Supprimer le champ category
  }
  
  // Vérifier que categoryId existe et est un CUID valide
  if (!processed.categoryId) {
    logger.error({ 
      receivedFields: {
        category: processed.category,
        categories: processed.categories,
        categoryId: processed.categoryId
      },
      allBodyKeys: Object.keys(processed)
    }, '❌ Catégorie manquante');
    
    throw new AppError('La catégorie est requise (champ "category", "categories" ou "categoryId")', 400, {
      code: 'MISSING_CATEGORY',
      received: { 
        category: processed.category, 
        categories: processed.categories,
        categoryId: processed.categoryId 
      },
      hint: 'Assurez-vous d\'envoyer un champ "category" (nom de catégorie) ou "categoryId" (ID CUID)'
    });
  }
  
  // Vérifier que categoryId est un CUID valide (format: commence par 'c' suivi de 24 caractères alphanumériques)
  const cuidPattern = /^c[a-z0-9]{24}$/;
  if (!cuidPattern.test(processed.categoryId)) {
    logger.error({ 
      categoryId: processed.categoryId,
      categoryIdType: typeof processed.categoryId,
      categoryIdLength: processed.categoryId?.length
    }, '❌ categoryId invalide (format CUID attendu)');
    
    throw new AppError(
      `Le categoryId fourni n'est pas un CUID valide: "${processed.categoryId}". Format attendu: "c" suivi de 24 caractères alphanumériques.`,
      400,
      {
        code: 'INVALID_CATEGORY_ID',
        received: processed.categoryId,
        expectedFormat: 'CUID (ex: cmj7lmc6l00004ygka3uf97vw)'
      }
    );
  }

  // Parser territories (chaîne JSON ou array)
  if (processed.territories) {
    logger.info({ territoriesRaw: processed.territories }, '🔄 Parsing de territories');
    const territories = parseJsonArray(processed.territories, 'territories');
    if (territories && territories.length > 0) {
      // Normaliser les territoires (première lettre en majuscule)
      processed.territories = territories.map((t: string) => {
        const territoryStr = String(t);
        return territoryStr.charAt(0).toUpperCase() + territoryStr.slice(1).toLowerCase();
      });
      logger.info({ territories: processed.territories }, '✅ Territories parsés et normalisés');
    } else {
      logger.warn({ territoriesRaw: processed.territories }, '⚠️ Aucun territoire valide après parsing');
      processed.territories = ['Martinique']; // Valeur par défaut
    }
  } else if (processed.territory) {
    // Fallback : si territory est fourni (ancien format), le convertir en array
    const territoryStr = String(processed.territory);
    const normalized = territoryStr.charAt(0).toUpperCase() + territoryStr.slice(1).toLowerCase();
    processed.territories = [normalized];
    delete processed.territory; // Supprimer l'ancien champ
    logger.info({ territory: normalized, territories: processed.territories }, '🔄 Conversion territory -> territories');
  } else {
    // Aucun territoire fourni, utiliser valeur par défaut
    processed.territories = ['Martinique'];
    logger.warn('⚠️ Aucun territoire fourni, utilisation de la valeur par défaut: Martinique');
  }

  // Convertir les nombres
  if (processed.tauxCashbackBase !== undefined && processed.tauxCashbackBase !== '') {
    processed.tauxCashbackBase = typeof processed.tauxCashbackBase === 'string' 
      ? parseFloat(processed.tauxCashbackBase) 
      : processed.tauxCashbackBase;
  }
  
  // Gérer discoveryCashbackRate et permanentCashbackRate
  // Si ces champs existent, utiliser le plus élevé comme tauxCashbackBase
  if (processed.discoveryCashbackRate || processed.permanentCashbackRate) {
    const discovery = processed.discoveryCashbackRate 
      ? (typeof processed.discoveryCashbackRate === 'string' ? parseFloat(processed.discoveryCashbackRate) : processed.discoveryCashbackRate)
      : 0;
    const permanent = processed.permanentCashbackRate 
      ? (typeof processed.permanentCashbackRate === 'string' ? parseFloat(processed.permanentCashbackRate) : processed.permanentCashbackRate)
      : 0;
    
    if (!processed.tauxCashbackBase || processed.tauxCashbackBase === '') {
      processed.tauxCashbackBase = Math.max(discovery, permanent);
    }
  }
  
  // Valeur par défaut pour tauxCashbackBase si non fourni
  if (!processed.tauxCashbackBase || processed.tauxCashbackBase === '') {
    processed.tauxCashbackBase = 0;
  }
  
  if (processed.latitude !== undefined && processed.latitude !== '') {
    processed.latitude = typeof processed.latitude === 'string' 
      ? parseFloat(processed.latitude) 
      : processed.latitude;
  }
  
  if (processed.longitude !== undefined && processed.longitude !== '') {
    processed.longitude = typeof processed.longitude === 'string' 
      ? parseFloat(processed.longitude) 
      : processed.longitude;
  }

  // Convertir les booléens
  if (processed.boostable !== undefined && processed.boostable !== '') {
    if (typeof processed.boostable === 'string') {
      processed.boostable = processed.boostable === 'true' || processed.boostable === '1' || processed.boostable === 'on';
    }
  }

  // Gérer boostEnabled (alias pour boostable)
  if (processed.boostEnabled !== undefined) {
    processed.boostable = processed.boostEnabled === 'true' || processed.boostEnabled === '1' || processed.boostEnabled === true;
  }

  // Convertir giftCardEnabled (string -> boolean)
  if (processed.giftCardEnabled !== undefined && processed.giftCardEnabled !== '') {
    if (typeof processed.giftCardEnabled === 'string') {
      processed.giftCardEnabled = processed.giftCardEnabled === 'true' || processed.giftCardEnabled === '1' || processed.giftCardEnabled === 'on';
    }
  }

  // Parser les tableaux JSON
  if (processed.marketingPrograms !== undefined && processed.marketingPrograms !== '') {
    processed.marketingPrograms = parseJsonArray(processed.marketingPrograms, 'marketingPrograms');
  }

  // Parser openingDays et les stocker en JSON string pour la base
  if (processed.openingDays !== undefined) {
    const daysArray = parseJsonArray(processed.openingDays, 'openingDays');
    processed.openingDays = Array.isArray(daysArray) && daysArray.length > 0 ? JSON.stringify(daysArray) : undefined;
  }

  // S'assurer que description et shortDescription sont bien préservés (ils sont dans le schéma Prisma)
  if (processed.description !== undefined) {
    logger.debug({ description: processed.description?.substring(0, 100) }, '✅ Champ description préservé pour sauvegarde');
  }
  if (processed.shortDescription !== undefined) {
    logger.debug({ shortDescription: processed.shortDescription }, '✅ Champ shortDescription préservé pour sauvegarde');
  }
  
  // Parser additionalInfo si c'est un objet JSON
  if (processed.additionalInfo !== undefined && typeof processed.additionalInfo === 'string') {
    try {
      const parsed = JSON.parse(processed.additionalInfo);
      if (typeof parsed === 'object') {
        processed.additionalInfo = parsed;
        logger.debug({ additionalInfo: 'parsed as JSON' }, '✅ additionalInfo parsé comme JSON');
      }
    } catch {
      // Si ce n'est pas du JSON valide, garder comme string
      logger.debug({ additionalInfo: processed.additionalInfo?.substring(0, 50) }, '✅ additionalInfo gardé comme string');
    }
  }
  
  // Parser affiliations si c'est une string JSON
  if (processed.affiliations !== undefined && typeof processed.affiliations === 'string') {
    try {
      const parsed = JSON.parse(processed.affiliations);
      if (Array.isArray(parsed)) {
        processed.affiliations = parsed;
        logger.debug({ affiliations: parsed }, '✅ affiliations parsé comme JSON array');
      }
    } catch {
      // Si ce n'est pas du JSON valide, essayer de le traiter comme un array avec un seul élément
      if (processed.affiliations.trim() !== '') {
        processed.affiliations = [processed.affiliations];
        logger.debug({ affiliations: processed.affiliations }, '✅ affiliations converti en array');
      }
    }
  }
  
  // Construire openingHours à partir de openingHoursStart et openingHoursEnd (back office)
  const start = processed.openingHoursStart != null ? String(processed.openingHoursStart).trim() : '';
  const end = processed.openingHoursEnd != null ? String(processed.openingHoursEnd).trim() : '';
  if ((start || end) && !processed.openingHours) {
    processed.openingHours = [start, end].filter(Boolean).join(' - ');
  }

  // Mapping des noms envoyés par l'admin vers les champs API (part du taux cashback)
  if (processed.welcomeUserRate !== undefined) processed.discoveryCashbackUserShare = processed.welcomeUserRate;
  if (processed.welcomeKashUPRate !== undefined) processed.discoveryCashbackKashupShare = processed.welcomeKashUPRate;
  if (processed.permanentUserRate !== undefined) processed.permanentCashbackUserShare = processed.permanentUserRate;
  if (processed.permanentKashUPRate !== undefined) processed.permanentCashbackKashupShare = processed.permanentKashUPRate;

  // Taux négocié (Affiliations) : offre bienvenue et offre permanente → discoveryCashbackRate et permanentCashbackRate (affichés dans l'app)
  if (processed.welcomeAffiliationAmount !== undefined && processed.welcomeAffiliationAmount !== '') {
    const val = typeof processed.welcomeAffiliationAmount === 'string' ? parseFloat(processed.welcomeAffiliationAmount) : processed.welcomeAffiliationAmount;
    if (!isNaN(val) && val >= 0) processed.discoveryCashbackRate = val;
  }
  if (processed.permanentAffiliationAmount !== undefined && processed.permanentAffiliationAmount !== '') {
    const val = typeof processed.permanentAffiliationAmount === 'string' ? parseFloat(processed.permanentAffiliationAmount) : processed.permanentAffiliationAmount;
    if (!isNaN(val) && val >= 0) processed.permanentCashbackRate = val;
  }
  // Mettre à jour tauxCashbackBase si nécessaire (max des deux taux)
  if (processed.discoveryCashbackRate != null || processed.permanentCashbackRate != null) {
    const d = typeof processed.discoveryCashbackRate === 'number' ? processed.discoveryCashbackRate : 0;
    const p = typeof processed.permanentCashbackRate === 'number' ? processed.permanentCashbackRate : 0;
    if (!processed.tauxCashbackBase || processed.tauxCashbackBase === 0) {
      processed.tauxCashbackBase = Math.max(d, p);
    }
  }

  // Gérer les champs supplémentaires envoyés par le frontend mais non stockés dans Partner
  // Ces champs sont ignorés mais parsés pour éviter les erreurs
  // NOTE: siret, phone, description, shortDescription, status, additionalInfo, affiliations, openingHours SONT stockés dans Partner
  const ignoredFields = [
    'boostEnabled', // Alias pour boostable (déjà converti en boostable)
    'giftCardCashbackRate', 'boostRate', // Champs spécifiques non stockés dans Partner
    'openingHoursStart', 'openingHoursEnd',
    'welcomeUserRate', 'welcomeKashUPRate', 'permanentUserRate', 'permanentKashUPRate', // Mappés vers discovery* / permanent*Share
    'welcomeAffiliationAmount', 'permanentAffiliationAmount', // Montants affiliation (non stockés en base)
    'giftCardImage', 'giftCardVirtualCardImage', // Fichiers non stockés dans Partner
  ];
  
  // Logger tous les champs qui ne sont pas dans le schéma Zod mais qui sont reçus
  const schemaFields = ['name', 'slug', 'logoUrl', 'shortDescription', 'description', 'siret', 'phone', 'openingHours', 'openingDays',
    'address', 'websiteUrl', 'facebookUrl', 'instagramUrl', 'tauxCashbackBase', 'discoveryCashbackRate', 'permanentCashbackRate',
    'discoveryCashbackKashupShare', 'discoveryCashbackUserShare', 'permanentCashbackKashupShare', 'permanentCashbackUserShare',
    'pointsPerTransaction', 'territories', 'latitude', 'longitude', 
    'boostable', 'giftCardEnabled', 'categoryId', 'status', 'additionalInfo', 'affiliations', 'menuImages', 'photos', 'marketingPrograms'];
  
  const unknownFields = Object.keys(processed).filter(key => 
    !schemaFields.includes(key) && 
    !ignoredFields.includes(key) && 
    processed[key] !== undefined
  );
  
  if (unknownFields.length > 0) {
    logger.warn({ 
      unknownFields,
      values: unknownFields.reduce((acc, field) => {
        const val = processed[field];
        if (typeof val === 'string' && val.length > 100) {
          acc[field] = val.substring(0, 100) + '...';
        } else {
          acc[field] = val;
        }
        return acc;
      }, {} as any)
    }, '⚠️ Champs reçus mais non reconnus dans le schéma (peut-être des affiliations ou infos complémentaires?)');
  }
  
  ignoredFields.forEach(field => {
    if (processed[field] !== undefined) {
      logger.debug({ field, value: processed[field] }, `⚠️ Champ ${field} ignoré (non stocké dans Partner)`);
      delete processed[field];
    }
  });
  
  // S'assurer que siret et phone sont bien préservés (ils sont dans le schéma Prisma)
  if (processed.siret !== undefined) {
    logger.debug({ siret: processed.siret }, '✅ Champ siret préservé pour sauvegarde');
  }
  if (processed.phone !== undefined) {
    logger.debug({ phone: processed.phone }, '✅ Champ phone préservé pour sauvegarde');
  }

  // Nettoyer les champs vides (les transformer en undefined)
  // MAIS préserver description et shortDescription même s'ils sont vides (ils peuvent être mis à jour explicitement)
  Object.keys(processed).forEach(key => {
    // Ne pas supprimer description et shortDescription même s'ils sont vides
    // (ils peuvent être mis à jour explicitement avec une chaîne vide)
    if (key === 'description' || key === 'shortDescription') {
      if (processed[key] === null) {
        processed[key] = undefined;
      }
      // Garder les chaînes vides pour description et shortDescription
      return;
    }
    
    if (processed[key] === '' || processed[key] === null) {
      processed[key] = undefined;
    }
  });
  
  // Logger les champs finaux qui seront envoyés à la validation
  logger.info({ 
    processedFields: Object.keys(processed).filter(key => processed[key] !== undefined),
    processedData: Object.entries(processed).reduce((acc, [key, value]) => {
      // Tronquer les valeurs longues pour les logs
      if (typeof value === 'string' && value.length > 100) {
        acc[key] = value.substring(0, 100) + '...';
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as any)
  }, '📤 Données traitées prêtes pour validation');
  
  // Nettoyer spécifiquement logoUrl si c'est une chaîne vide ou invalide
  // (le logoUrl valide sera ajouté après le traitement du fichier)
  if (processed.logoUrl !== undefined) {
    const logoUrlStr = String(processed.logoUrl).trim();
    if (logoUrlStr === '' || logoUrlStr === 'null' || logoUrlStr === 'undefined') {
      processed.logoUrl = undefined;
    } else {
      // Vérifier si c'est une URL valide (absolue ou relative)
      // Les URLs relatives commencent par / (ex: /uploads/partners/file.jpg)
      // Les URLs absolues commencent par http:// ou https://
      const isRelativeUrl = logoUrlStr.startsWith('/');
      const isAbsoluteUrl = logoUrlStr.startsWith('http://') || logoUrlStr.startsWith('https://');
      
      if (isRelativeUrl || isAbsoluteUrl) {
        // C'est une URL valide (relative ou absolue), on la garde
        logger.debug({ logoUrl: logoUrlStr, type: isRelativeUrl ? 'relative' : 'absolute' }, '✅ logoUrl valide conservé');
      } else {
        // Ce n'est pas une URL valide, on la supprime
        logger.warn({ logoUrl: logoUrlStr }, '⚠️ logoUrl invalide (ni relative ni absolue), supprimé');
        processed.logoUrl = undefined;
      }
    }
  }

  // Supprimer les champs qui n'existent pas dans le schéma Prisma
  const allowedFields = [
    'name', 'slug', 'logoUrl', 'shortDescription', 'description', 'siret', 'phone', 'openingHours', 'openingDays',
    'address', 'websiteUrl', 'facebookUrl', 'instagramUrl', 'territoryDetails',
    'tauxCashbackBase', 'discoveryCashbackRate', 'permanentCashbackRate',
    'discoveryCashbackKashupShare', 'discoveryCashbackUserShare', 'permanentCashbackKashupShare', 'permanentCashbackUserShare',
    'pointsPerTransaction', 'territories', 'latitude', 'longitude', 'boostable', 'giftCardEnabled', 'categoryId',
    'status', 'additionalInfo', 'affiliations', 'menuImages', 'photos', 'marketingPrograms'
  ];
  
  const cleaned: any = {};
  allowedFields.forEach(field => {
    if (processed[field] !== undefined) {
      cleaned[field] = processed[field];
    }
  });

  return cleaned;
};

export const createPartnerHandler = asyncHandler(async (req: Request, res: Response) => {
  // Log immédiat pour confirmer que le handler est appelé
  logger.info('🚀 createPartnerHandler appelé');
  
  // Détecter le type de requête (JSON ou multipart)
  const contentType = req.headers['content-type'] || '';
  const isMultipart = contentType.includes('multipart/form-data');
  const filesForLog = extractFiles(req);
  const hasFile = !!(filesForLog.fields && Object.keys(filesForLog.fields).length > 0);

  // Log du payload reçu en dev
  if (process.env.NODE_ENV === 'development') {
    logger.info({
      contentType,
      isMultipart,
      hasFile,
      fileFields: filesForLog.fields ? Object.keys(filesForLog.fields) : [],
      logoFile: !!filesForLog.fields?.logo?.[0],
      bodyKeys: Object.keys(req.body || {}),
      bodyValues: Object.entries(req.body || {}).reduce((acc, [key, value]) => {
        // Tronquer les valeurs longues pour les logs
        if (typeof value === 'string' && value.length > 100) {
          acc[key] = value.substring(0, 100) + '...';
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as any),
      // Logger spécifiquement les champs importants
      importantFields: {
        name: req.body.name,
        category: req.body.category,
        categories: req.body.categories,
        territories: req.body.territories,
        territory: req.body.territory,
        status: req.body.status,
        discoveryCashbackRate: req.body.discoveryCashbackRate,
        permanentCashbackRate: req.body.permanentCashbackRate,
        giftCardEnabled: req.body.giftCardEnabled,
        boostEnabled: req.body.boostEnabled,
        marketingPrograms: req.body.marketingPrograms,
        openingDays: req.body.openingDays
      },
      files: filesForLog.fields ? Object.keys(filesForLog.fields) : 'no files',
      user: req.user ? { id: req.user.sub, role: req.user.role } : 'no user'
    }, `📥 Données reçues pour création de partenaire (${isMultipart ? 'multipart' : 'JSON'})`);
  }

  // Extraire les fichiers depuis req (format multer.fields, comme PATCH)
  const files = extractFiles(req);
  const logoFile = files.fields?.logo?.[0];
  let logoUrl: string | null = null;

  if (logoFile) {
    const allowedImageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedImageMimes.includes(logoFile.mimetype)) {
      throw new AppError(
        `Type de fichier non autorisé pour logo: ${logoFile.mimetype}. Types acceptés: images (JPEG, PNG, WebP, GIF).`,
        400,
        {
          code: 'INVALID_FILE_TYPE',
          received: logoFile.mimetype,
          allowed: allowedImageMimes
        }
      );
    }
    const fs = await import('fs');
    if (fs.existsSync(logoFile.path)) {
      logger.info({ path: logoFile.path, filename: logoFile.filename, size: logoFile.size, mimetype: logoFile.mimetype }, '✅ Fichier logo vérifié et existe sur le disque');
    } else {
      logger.error({ path: logoFile.path, filename: logoFile.filename }, '❌ Fichier logo N\'EXISTE PAS sur le disque');
    }
    const processedLogoUrl = await processUploadedFile(logoFile, 'partners');
    logoUrl = processedLogoUrl || null;
    logger.info({ logoUrl, filePath: logoFile.path, filename: logoFile.filename, mimetype: logoFile.mimetype, size: logoFile.size }, '✅ Logo traité');
  } else {
    logger.info('ℹ️ Aucun logo fourni (optionnel)');
  }

  try {
    logger.info('🔄 Début du traitement des données');
    
    // Préparer les données avec conversion de types
    let formData;
    try {
      // Préparer les données de base (sans logoUrl pour éviter les conflits)
      const bodyData = { ...req.body };
      
      // Si un logo a été uploadé, utiliser son URL, sinon utiliser celui du body (s'il est valide)
      if (logoUrl) {
        bodyData.logoUrl = logoUrl;
        logger.info({ logoUrl }, '✅ logoUrl défini depuis fichier uploadé');
      } else if (bodyData.logoUrl) {
        // Vérifier que logoUrl du body est valide (relative ou absolue)
        const logoUrlStr = String(bodyData.logoUrl).trim();
        if (logoUrlStr === '' || logoUrlStr === 'null' || logoUrlStr === 'undefined') {
          delete bodyData.logoUrl;
          logger.info('⚠️ logoUrl du body est vide, supprimé');
        } else {
          const isRelativeUrl = logoUrlStr.startsWith('/');
          const isAbsoluteUrl = logoUrlStr.startsWith('http://') || logoUrlStr.startsWith('https://');
          
          if (isRelativeUrl || isAbsoluteUrl) {
            logger.info({ logoUrl: logoUrlStr, type: isRelativeUrl ? 'relative' : 'absolute' }, '✅ logoUrl du body est valide');
          } else {
            delete bodyData.logoUrl;
            logger.warn({ logoUrl: logoUrlStr }, '⚠️ logoUrl du body est invalide (ni relative ni absolue), supprimé');
          }
        }
      }
      
      formData = await processFormData(bodyData);
      logger.info({ 
        formData: {
          ...formData,
          logoUrl: formData.logoUrl ? `${formData.logoUrl.substring(0, 50)}...` : undefined
        }
      }, '📋 Données traitées après conversion');
    } catch (processError) {
      logger.error({
        error: processError instanceof Error ? processError.message : String(processError),
        stack: processError instanceof Error ? processError.stack : undefined,
        body: req.body
      }, '❌ Erreur lors du traitement des données (processFormData)');
      
      if (processError instanceof AppError) {
        throw processError;
      }
      
      throw new AppError(
        `Erreur lors du traitement des données: ${processError instanceof Error ? processError.message : String(processError)}`,
        400,
        {
          code: 'DATA_PROCESSING_ERROR',
          originalError: processError instanceof Error ? processError.message : String(processError),
          ...(process.env.NODE_ENV === 'development' && {
            stack: processError instanceof Error ? processError.stack : undefined
          })
        }
      );
    }

    // Valider les données après conversion
    logger.info('🔍 Début de la validation');
    logger.debug({ 
      formDataKeys: Object.keys(formData),
      categoryId: formData.categoryId,
      categoryIdType: typeof formData.categoryId,
      hasLogoUrl: !!formData.logoUrl
    }, '📋 Données avant validation Zod');
    
    const validationResult = createPartnerSchema.safeParse(formData);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.flatten();
      const fieldErrors = errorDetails.fieldErrors;
      
      // Logger les erreurs de validation en détail
      logger.error({ 
        errors: errorDetails,
        fieldErrors,
        formData: {
          ...formData,
          logoUrl: formData.logoUrl ? `${formData.logoUrl.substring(0, 50)}...` : undefined,
          categoryId: formData.categoryId,
          categoryIdType: typeof formData.categoryId
        },
        zodErrors: validationResult.error.errors
      }, '❌ Erreur de validation Zod');
      
      // Construire un message d'erreur plus détaillé
      const errorMessages: string[] = [];
      Object.entries(fieldErrors).forEach(([field, errors]) => {
        if (errors && errors.length > 0) {
          errorMessages.push(`${field}: ${errors.join(', ')}`);
        }
      });
      
      const detailedMessage = errorMessages.length > 0 
        ? `Données invalides: ${errorMessages.join('; ')}`
        : 'Données invalides';
      
      throw new AppError(detailedMessage, 422, {
        code: 'VALIDATION_ERROR',
        details: errorDetails,
        fieldErrors
      });
    }

    logger.info('✅ Validation réussie, création du partenaire');
    logger.info({ 
      logoUrl: validationResult.data.logoUrl,
      hasLogoUrl: !!validationResult.data.logoUrl,
      dataKeys: Object.keys(validationResult.data)
    }, '📋 Données validées avant création');
    
    let partner: ReturnType<typeof formatPartnerResponse>;
    try {
      partner = await createPartner(validationResult.data);
      logger.info({ 
        partnerId: partner.id,
        partnerName: partner.name,
        category: partner.category?.name
      }, '✅ Partenaire créé avec succès');
      
      // Déplacer le fichier logo vers uploads/partners/:id après création
      if (partner.id && logoFile) {
        try {
          // Vérifier que le fichier existe avant de le déplacer
          const fs = await import('fs');
          const pathModule = await import('path');
          
          const fileExists = fs.existsSync(logoFile.path);
          logger.info({ 
            partnerId: partner.id,
            logoFile: {
              filename: logoFile.filename,
              path: logoFile.path,
              destination: logoFile.destination,
              exists: fileExists
            },
            currentLogoUrl: logoUrl
          }, '🔄 Début du déplacement du logo vers uploads/partners/:id');
          
          if (!fileExists) {
            logger.error({ 
              partnerId: partner.id,
              filePath: logoFile.path,
              filename: logoFile.filename
            }, '❌ Le fichier logo n\'existe pas à l\'emplacement attendu');
            throw new Error(`Le fichier logo n'existe pas: ${logoFile.path}`);
          }
          
          await moveFilesToPartnerFolder([logoFile], partner.id);
          logger.info({ 
            partnerId: partner.id,
            fileField: logoFile.fieldname,
            filename: logoFile.filename
          }, '✅ Logo déplacé vers uploads/partners/:id');
          
          // Vérifier que le fichier a bien été déplacé
          const expectedPath = pathModule.join(process.cwd(), 'uploads', 'partners', partner.id, logoFile.filename);
          const fileMoved = fs.existsSync(expectedPath);
          
          if (!fileMoved) {
            logger.error({ 
              partnerId: partner.id,
              expectedPath,
              originalPath: logoFile.path
            }, '❌ Le fichier n\'a pas été déplacé correctement');
            throw new Error(`Le fichier n'a pas été déplacé vers: ${expectedPath}`);
          }
          
          logger.info({ 
            partnerId: partner.id,
            newPath: expectedPath
          }, '✅ Fichier vérifié et existe au nouvel emplacement');
          
          // Mettre à jour l'URL dans la base de données pour pointer vers uploads/partners/:id
          const partnerId = partner.id;
          
          // Vérifier que l'ID du partenaire est valide
          if (!partnerId || typeof partnerId !== 'string' || partnerId.trim() === '') {
            logger.error({ 
              partnerId,
              partner: partner ? { id: partner.id, name: partner.name } : null
            }, '❌ ID du partenaire invalide ou manquant');
            throw new Error('ID du partenaire invalide ou manquant');
          }
          
          // Générer la nouvelle URL relative correcte
          const newRelativePath = `/uploads/partners/${partnerId}/${logoFile.filename}`;
          
          logger.info({ 
            oldLogoUrl: logoUrl,
            newLogoUrl: newRelativePath,
            partnerId,
            partnerIdType: typeof partnerId,
            partnerIdLength: partnerId.length
          }, '🔄 Mise à jour de logoUrl dans la base de données');
          
          const { default: prismaClient } = await import('../config/prisma');
          const baseInclude = { category: { select: { id: true, name: true } } };
          
          try {
            await prismaClient.partner.update({
              where: { id: partnerId },
              data: { logoUrl: newRelativePath }
            });
            
            logger.info({ 
              partnerId,
              newLogoUrl: newRelativePath
            }, '✅ logoUrl mis à jour dans la base de données');
          } catch (updateError) {
            logger.error({
              partnerId,
              error: updateError instanceof Error ? updateError.message : String(updateError),
              stack: updateError instanceof Error ? updateError.stack : undefined
            }, '❌ Erreur lors de la mise à jour du logoUrl dans la base de données');
            throw updateError;
          }
          
          // Recharger le partenaire avec la nouvelle URL
          try {
            const updatedPartner = await prismaClient.partner.findUnique({
              where: { id: partnerId },
              include: baseInclude
            });
            
            if (updatedPartner) {
              partner = formatPartnerResponse(updatedPartner);
              logger.info({ 
                partnerId,
                finalLogoUrl: partner.logoUrl
              }, '✅ Partenaire rechargé avec le nouveau logoUrl');
            } else {
              logger.error({ partnerId }, '❌ Impossible de recharger le partenaire après mise à jour du logoUrl');
            }
          } catch (findError) {
            logger.error({
              partnerId,
              error: findError instanceof Error ? findError.message : String(findError)
            }, '❌ Erreur lors du rechargement du partenaire');
            // Ne pas bloquer si le rechargement échoue, on a déjà le partenaire
          }
        } catch (moveError) {
          logger.error({
            partnerId: partner.id,
            error: moveError instanceof Error ? moveError.message : String(moveError),
            stack: moveError instanceof Error ? moveError.stack : undefined,
            logoFile: logoFile ? {
              filename: logoFile.filename,
              path: logoFile.path,
              destination: logoFile.destination
            } : null
          }, '❌ Erreur lors du déplacement du logo');
          // Ne pas bloquer la création si le déplacement échoue, mais logger l'erreur
        }
      } else {
        if (!partner.id) {
          logger.warn('⚠️ Impossible de déplacer le logo : partner.id est undefined');
        }
        if (!logoFile) {
          logger.info('ℹ️ Aucun logo à déplacer');
        }
      }
      
      logger.info({ 
        partnerId: partner.id,
        partnerName: partner.name
      }, '✅ Partenaire créé avec succès - Synchronisation avec l\'application mobile en cours');
    } catch (createError) {
      logger.error({
        error: createError instanceof Error ? createError.message : String(createError),
        stack: createError instanceof Error ? createError.stack : undefined,
        errorName: createError instanceof Error ? createError.constructor.name : typeof createError,
        formData: validationResult.data
      }, '❌ Erreur lors de la création en base de données');
      
      if (createError instanceof AppError) {
        throw createError;
      }
      
      // Vérifier si c'est une erreur Prisma
      const isPrismaError = createError && typeof createError === 'object' && 'code' in createError;
      if (isPrismaError) {
        const prismaCode = (createError as any).code;
        const prismaMeta = (createError as any).meta;
        
        let message = 'Erreur de base de données';
        if (prismaCode === 'P2002') {
          message = 'Un partenaire avec ce nom ou ce slug existe déjà';
        } else if (prismaCode === 'P2003') {
          message = 'La catégorie spécifiée n\'existe pas';
        }
        
        throw new AppError(message, 500, {
          code: 'PRISMA_ERROR',
          prismaCode,
          prismaMeta,
          ...(process.env.NODE_ENV === 'development' && {
            originalError: createError instanceof Error ? createError.message : String(createError)
          })
        });
      }
      
      throw new AppError(
        `Erreur lors de la création du partenaire: ${createError instanceof Error ? createError.message : String(createError)}`,
        500,
        {
          code: 'DATABASE_ERROR',
          ...(process.env.NODE_ENV === 'development' && {
            stack: createError instanceof Error ? createError.stack : undefined,
            originalError: createError instanceof Error ? createError.message : String(createError),
            errorName: createError instanceof Error ? createError.constructor.name : typeof createError
          })
        }
      );
    }
    
    // Sérialiser le partenaire selon le contexte (public vs admin) avec transformation des URLs
    const serialized = serializePartner(req, partner);
    sendSuccess(res, serialized, null, 201, 'Partenaire créé avec succès');
  } catch (error) {
    // Logger l'erreur complète avec stack trace
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'no files',
      isAppError: error instanceof AppError
    }, '❌ Erreur lors de la création du partenaire (catch final)');

    // Si c'est déjà une AppError, la propager
    if (error instanceof AppError) {
      throw error;
    }

    // Sinon, créer une AppError avec les détails
    throw new AppError(
      error instanceof Error ? error.message : 'Erreur lors de la création du partenaire',
      500,
      {
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error instanceof Error ? error.stack : undefined,
          originalError: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.constructor.name : typeof error
        })
      }
    );
  }
});

export const updatePartnerHandler = asyncHandler(async (req: Request, res: Response) => {
  // Logger les données reçues en développement
  if (process.env.NODE_ENV !== 'production') {
    logger.debug({
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'no files',
      file: req.file ? req.file.fieldname : 'no single file'
    }, '📥 Données reçues pour mise à jour de partenaire');
  }

  const files = extractFiles(req);
  
  // Traiter les fichiers uploadés (pour PATCH, utiliser directement uploads/partners/:id)
  const partnerId = req.params.id;
  const logoFile = files.fields?.logo?.[0];
  const kbisFile = files.fields?.kbis?.[0];
  const menuImageFiles = files.fields?.menuImages || [];
  const photoFiles = files.fields?.photos || [];
  
  // Pour les mises à jour, utiliser directement le dossier du partenaire
  let logoUrl: string | undefined;
  let kbisUrl: string | undefined;
  let menuImages: string[] | undefined;
  let photos: string[] | undefined;
  
  // Traiter les fichiers uploadés
  if (logoFile) {
    logger.info({ 
      filename: logoFile.filename,
      path: logoFile.path,
      destination: logoFile.destination,
      fieldname: logoFile.fieldname,
      size: logoFile.size,
      mimetype: logoFile.mimetype
    }, '📁 Informations du fichier logo reçu');
    
    // Vérifier que le fichier existe bien sur le disque
    const fs = await import('fs');
    if (fs.existsSync(logoFile.path)) {
      logger.info({ path: logoFile.path }, '✅ Fichier logo existe sur le disque');
    } else {
      logger.error({ path: logoFile.path }, '❌ Fichier logo N\'EXISTE PAS sur le disque');
    }
    
    logoUrl = await processUploadedFile(logoFile, 'partners', partnerId) ?? undefined;
    logger.info({ logoUrl, mimetype: logoFile.mimetype, size: logoFile.size }, '✅ Logo traité pour mise à jour');
  } else if (req.body.logoUrl) {
    // Vérifier que logoUrl du body est valide (relative ou absolue)
    const logoUrlStr = String(req.body.logoUrl).trim();
    if (logoUrlStr !== '' && logoUrlStr !== 'null' && logoUrlStr !== 'undefined') {
      const isRelativeUrl = logoUrlStr.startsWith('/');
      const isAbsoluteUrl = logoUrlStr.startsWith('http://') || logoUrlStr.startsWith('https://');
      if (isRelativeUrl || isAbsoluteUrl) {
        logoUrl = logoUrlStr;
        logger.info({ logoUrl: logoUrlStr, type: isRelativeUrl ? 'relative' : 'absolute' }, '✅ logoUrl du body est valide');
      } else {
        logger.warn({ logoUrl: logoUrlStr }, '⚠️ logoUrl du body est invalide, ignoré');
      }
    }
  }
  
  if (kbisFile) {
    kbisUrl = (await processUploadedFile(kbisFile, 'partners', partnerId)) ?? undefined;
    logger.info({ kbisUrl }, '✅ KBIS traité pour mise à jour');
  } else if (req.body.kbisUrl) {
    kbisUrl = req.body.kbisUrl;
  }
  
  if (menuImageFiles.length > 0) {
    menuImages = await processUploadedFiles(menuImageFiles, 'partners', partnerId);
    logger.info({ count: menuImages.length }, '✅ Menu images traitées pour mise à jour');
  } else if (req.body.menuImages) {
    menuImages = Array.isArray(req.body.menuImages) ? req.body.menuImages : undefined;
  }
  
  if (photoFiles.length > 0) {
    photos = await processUploadedFiles(photoFiles, 'partners', partnerId);
    logger.info({ count: photos.length }, '✅ Photos traitées pour mise à jour');
  } else if (req.body.photos) {
    photos = Array.isArray(req.body.photos) ? req.body.photos : undefined;
  }

  try {
    // Corriger les URLs avec duplication uploadsuploads si nécessaire
    let correctedLogoUrl = logoUrl;
    if (correctedLogoUrl) {
      correctedLogoUrl = correctedLogoUrl.replace(/\/uploadsuploads\//g, '/uploads/');
      if (correctedLogoUrl !== logoUrl) {
        logger.info({ original: logoUrl, corrected: correctedLogoUrl }, '🔧 URL logo corrigée (duplication uploadsuploads)');
        logoUrl = correctedLogoUrl;
      }
    }
    
    // Préparer les données avec conversion de types
    logger.info({ 
      logoUrl,
      hasLogoUrl: !!logoUrl,
      logoUrlType: typeof logoUrl,
      bodyLogoUrl: req.body.logoUrl,
      hasLogoFile: !!logoFile
    }, '📸 État du logoUrl avant processFormData');
    
    const formData = await processFormData({
      ...req.body,
      logoUrl: logoUrl || undefined,
      kbisUrl: kbisUrl || undefined,
      menuImages,
      photos
    });

    logger.info({ 
      formDataLogoUrl: formData.logoUrl,
      hasFormDataLogoUrl: !!formData.logoUrl,
      formDataKeys: Object.keys(formData)
    }, '📋 Données traitées après conversion');

    // Valider les données après conversion
    const validationResult = updatePartnerSchema.safeParse(formData);
    if (!validationResult.success) {
      const errorDetails = validationResult.error.flatten();
      const fieldErrors = errorDetails.fieldErrors;
      
      // Construire un message d'erreur plus détaillé
      const errorMessages: string[] = [];
      Object.entries(fieldErrors).forEach(([field, errors]) => {
        if (errors && errors.length > 0) {
          errorMessages.push(`${field}: ${errors.join(', ')}`);
        }
      });
      
      const detailedMessage = errorMessages.length > 0 
        ? `Données invalides: ${errorMessages.join('; ')}`
        : 'Données invalides';
      
      logger.error({ 
        errors: errorDetails,
        fieldErrors,
        formData,
        errorMessages
      }, '❌ Erreur de validation');
      
      throw new AppError(detailedMessage, 422, {
        code: 'VALIDATION_ERROR',
        details: errorDetails,
        fieldErrors
      });
    }

    logger.info({ 
      validationDataLogoUrl: validationResult.data.logoUrl,
      hasValidationLogoUrl: !!validationResult.data.logoUrl,
      validationDataKeys: Object.keys(validationResult.data)
    }, '✅ Validation réussie, données avant mise à jour');
    
    const partner = await updatePartner(req.params.id, validationResult.data);
    
    // Vérifier que le fichier logo existe bien sur le disque après la mise à jour
    if (logoFile && partner.logoUrl) {
      const fs = await import('fs');
      const pathModule = await import('path');
      
      // Chemin attendu basé sur l'URL stockée dans la base de données
      // L'URL est de la forme /uploads/partners/:id/filename
      const urlPath = partner.logoUrl.replace(/^https?:\/\/[^\/]+/, '').replace(/^\//, '');
      const expectedPathFromUrl = pathModule.join(process.cwd(), urlPath);
      
      // Chemin attendu basé sur la structure standard
      const expectedPathStandard = pathModule.join(process.cwd(), 'uploads', 'partners', partner.id, logoFile.filename);
      
      // Chemin réel où Multer a sauvegardé le fichier
      const actualPath = logoFile.path;
      
      logger.info({ 
        logoUrl: partner.logoUrl,
        urlPath,
        expectedPathFromUrl,
        expectedPathStandard,
        actualPath,
        filename: logoFile.filename
      }, '🔍 Vérification de l\'emplacement du fichier logo');
      
      // Vérifier si le fichier existe à l'emplacement attendu depuis l'URL
      if (fs.existsSync(expectedPathFromUrl)) {
        logger.info({ 
          path: expectedPathFromUrl,
          logoUrl: partner.logoUrl
        }, '✅ Fichier logo vérifié et existe à l\'emplacement attendu (depuis URL)');
      } else if (fs.existsSync(expectedPathStandard)) {
        logger.info({ 
          path: expectedPathStandard,
          logoUrl: partner.logoUrl
        }, '✅ Fichier logo vérifié et existe à l\'emplacement standard');
      } else if (fs.existsSync(actualPath)) {
        logger.warn({ 
          actualPath,
          expectedPathFromUrl,
          expectedPathStandard,
          logoUrl: partner.logoUrl
        }, '⚠️ Fichier existe mais à un emplacement différent de celui attendu');
        
        // Essayer de déplacer le fichier au bon endroit
        try {
          const destDir = pathModule.dirname(expectedPathStandard);
          if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
            logger.info({ destDir }, '📁 Dossier de destination créé');
          }
          fs.copyFileSync(actualPath, expectedPathStandard);
          logger.info({ 
            from: actualPath,
            to: expectedPathStandard
          }, '✅ Fichier copié vers l\'emplacement attendu');
        } catch (copyError) {
          logger.error({ 
            error: copyError instanceof Error ? copyError.message : String(copyError),
            from: actualPath,
            to: expectedPathStandard
          }, '❌ Erreur lors de la copie du fichier');
        }
      } else {
        logger.error({ 
          expectedPathFromUrl,
          expectedPathStandard,
          actualPath,
          logoUrl: partner.logoUrl,
          filename: logoFile.filename
        }, '❌ Fichier logo N\'EXISTE PAS à aucun emplacement');
      }
    }
    
    logger.info({ 
      partnerId: partner.id,
      partnerLogoUrl: partner.logoUrl,
      hasPartnerLogoUrl: !!partner.logoUrl
    }, '✅ Partenaire mis à jour avec succès');
    
    // Sérialiser le partenaire selon le contexte (public vs admin) avec transformation des URLs
    const serialized = serializePartner(req, partner);
    sendSuccess(res, serialized, null, 200, 'Partenaire mis à jour avec succès');
  } catch (error) {
    // Logger l'erreur complète avec stack trace
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      body: req.body,
      files: req.files ? Object.keys(req.files) : 'no files',
      partnerId: req.params.id
    }, '❌ Erreur lors de la mise à jour du partenaire');

    // Si c'est déjà une AppError, la propager
    if (error instanceof AppError) {
      throw error;
    }

    // Sinon, créer une AppError avec les détails
    throw new AppError(
      error instanceof Error ? error.message : 'Erreur lors de la mise à jour du partenaire',
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
});

export const getCategories = asyncHandler(async (_req: Request, res: Response) => {
  const categories = await listCategories();
  // Retourner les catégories avec id et name pour le mobile (filtrage par categoryId)
  const list = categories.map((cat: { id: string; name: string }) => ({ id: cat.id, name: cat.name }));
  sendSuccess(res, list, null, 200, 'Catégories récupérées avec succès');
});

export const createCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = await createCategory(req.body);
  sendSuccess(res, category, null, 201);
});

export const updateCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  const category = await updateCategory(req.params.id, req.body);
  sendSuccess(res, category);
});

export const deleteCategoryHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteCategory(req.params.id);
  sendSuccess(res, { deleted: true });
});

export const getPartnerStatisticsHandler = asyncHandler(async (req: Request, res: Response) => {
  const statistics = await getPartnerStatistics(req.params.id);
  sendSuccess(res, statistics, null, 200, 'Statistiques du partenaire récupérées avec succès');
});

export const deletePartnerHandler = asyncHandler(async (req: Request, res: Response) => {
  await deletePartner(req.params.id);
  sendSuccess(res, null, null, 200, 'Partenaire supprimé avec succès');
});

export const listPartnerTerritoriesHandler = asyncHandler(async (_req: Request, res: Response) => {
  const territories = await listPartnerTerritories();
  sendSuccess(res, territories);
});

export const getPartnerDocumentsHandler = asyncHandler(async (req: Request, res: Response) => {
  const documents = await getPartnerDocuments(req.params.id);
  const withAbsoluteUrls = documents.map((doc) => ({
    ...doc,
    url: doc.url && !doc.url.startsWith('http') ? buildAbsoluteUrl(req, doc.url) : doc.url,
  }));
  sendSuccess(res, withAbsoluteUrls, null, 200, 'Documents du partenaire récupérés avec succès');
});

export const uploadPartnerDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const partnerId = req.params.id;
  if (!req.file) {
    throw new AppError('Aucun fichier fourni', 400, { code: 'MISSING_FILE' });
  }
  const name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim() : req.file.originalname || 'Document';
  const type = typeof req.body.type === 'string' && ['invoice', 'commercial_analysis', 'contract', 'other'].includes(req.body.type) ? req.body.type : 'other';
  const relativePath = path.relative(process.cwd(), req.file.path);
  const url = getFileUrl(relativePath);
  const size = req.file.size ? `${(req.file.size / 1024).toFixed(1)} Ko` : undefined;
  const document = await createPartnerDocument(partnerId, { name, type, url, size });
  const withAbsoluteUrl = {
    ...document,
    url: document.url && !document.url.startsWith('http') ? buildAbsoluteUrl(req, document.url) : document.url,
  };
  sendSuccess(res, withAbsoluteUrl, null, 201, 'Document ajouté avec succès');
});

export const deletePartnerDocumentHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id: partnerId, documentId } = req.params;
  await deletePartnerDocument(partnerId, documentId);
  sendSuccess(res, null, null, 204);
});

// ——— Alias partenaires (reconnaissance cashback Powens) ———
export const getPartnerAliasesHandler = asyncHandler(async (req: Request, res: Response) => {
  const aliases = await getPartnerAliases(req.params.id);
  sendSuccess(res, aliases, null, 200, 'Alias du partenaire récupérés avec succès');
});

export const createPartnerAliasHandler = asyncHandler(async (req: Request, res: Response) => {
  const partnerId = req.params.id;
  const parsed = createPartnerAliasSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError('Données invalides', 422, { code: 'VALIDATION_ERROR', details: parsed.error.flatten() });
  }
  const alias = await createPartnerAlias(partnerId, parsed.data);
  sendSuccess(res, alias, null, 201, 'Alias ajouté avec succès');
});

export const deletePartnerAliasHandler = asyncHandler(async (req: Request, res: Response) => {
  const { id: partnerId, aliasId } = req.params;
  await deletePartnerAlias(partnerId, aliasId);
  sendSuccess(res, null, null, 204);
});


