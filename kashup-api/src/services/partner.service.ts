import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import {
  CategoryInput,
  CreatePartnerInput,
  PartnerFilterInput,
  UpdatePartnerInput
} from '../schemas/partner.schema';
import { AppError } from '../utils/errors';
import { parseAroundMe } from '../utils/geo';
import { slugify } from '../utils/slugify';
import { emitPartnerWebhook, emitWebhook } from './webhook.service';
import logger from '../utils/logger';
import { TERRITORIES } from '../types/domain';
import { buildListMeta, buildListQuery, ListParams } from '../utils/listing';
import { safePrismaQuery } from '../utils/timeout';

const ensureSlug = async (desired: string) => {
  const base = slugify(desired);
  let candidate = base;
  let count = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.partner.findUnique({ where: { slug: candidate } });
    if (!exists) return candidate;
    candidate = `${base}-${count}`;
    count += 1;
  }
};

/**
 * Construit la clause WHERE Prisma en fonction des filtres fournis
 * Ne filtre QUE sur les paramètres réellement présents et non vides
 * 
 * @param filters - Filtres de recherche (tous optionnels)
 * @returns Clause WHERE Prisma
 */
const buildWhere = (filters: PartnerFilterInput): Prisma.PartnerWhereInput => {
  const where: Prisma.PartnerWhereInput = {};

  // Recherche textuelle : seulement si search n'est pas vide
  if (filters.search && filters.search.trim() !== '') {
    const search = filters.search.trim();
    where.OR = [
      { name: { contains: search } },
      { shortDescription: { contains: search } }
    ];
  }

  // Filtre par catégorie : ignore si vide, undefined, null ou 'all'
  // Supporte categoryId (CUID) ou category (nom, converti en categoryId dans le contrôleur)
  if (filters.categoryId && 
      filters.categoryId.trim() !== '' && 
      filters.categoryId !== 'all' && 
      filters.categoryId !== 'null' && 
      filters.categoryId !== 'undefined') {
    where.categoryId = filters.categoryId;
  }
  // Note: Si category (nom) est fourni, il est converti en categoryId dans le contrôleur
  // avant d'appeler ce service, donc on n'a pas besoin de le gérer ici

  // Filtre par territoire : ignore si 'all', vide, undefined, null
  // Supporte territoire (ancien format) ou territory (nouveau format)
  const territoryToFilter = filters.territory || filters.territoire;
  if (territoryToFilter && 
      territoryToFilter !== 'all' && 
      territoryToFilter.trim() !== '' &&
      territoryToFilter !== 'null' &&
      territoryToFilter !== 'undefined') {
    // Normaliser le territoire (première lettre majuscule)
    const normalized = territoryToFilter.trim().charAt(0).toUpperCase() + territoryToFilter.trim().slice(1).toLowerCase();
    // Rechercher les partenaires qui ont ce territoire dans leur array territories (JSON string)
    where.territories = {
      contains: `"${normalized}"`
    } as any;
  }
  
  // Filtre par plusieurs territoires (array) : ignore si vide
  if (filters.territories && 
      Array.isArray(filters.territories) && 
      filters.territories.length > 0) {
    // Filtrer les territoires valides (non vides, non 'all')
    const validTerritories = filters.territories
      .filter(t => t && 
                   t !== 'all' && 
                   typeof t === 'string' && 
                   t.trim() !== '' &&
                   t !== 'null' &&
                   t !== 'undefined')
      .map(territory => {
        const normalized = String(territory).trim().charAt(0).toUpperCase() + String(territory).trim().slice(1).toLowerCase();
        return {
          territories: {
            contains: `"${normalized}"`
          }
        };
      }) as any[];
    
    if (validTerritories.length > 0) {
      // Combiner avec les autres conditions OR si elles existent
      if (where.OR) {
        where.OR = [...where.OR, ...validTerritories];
      } else {
        where.OR = validTerritories;
      }
    }
  }

  // Filtre par programme marketing
  if (filters.marketingProgram) {
    where.marketingPrograms = {
      contains: `"${filters.marketingProgram}"`
    };
  }

  const around = parseAroundMe(filters.autourDeMoi);
  if (around) {
    const latDelta = around.radiusKm / 111;
    const lngDelta = around.radiusKm / (111 * Math.cos((around.lat * Math.PI) / 180));
    where.AND = [
      { latitude: { gte: around.lat - latDelta } },
      { latitude: { lte: around.lat + latDelta } },
      { longitude: { gte: around.lng - lngDelta } },
      { longitude: { lte: around.lng + lngDelta } }
    ];
  }

  return where;
};

const baseInclude = {
  category: { select: { id: true, name: true } }
};

// Fonction helper pour parser les champs JSON
const parseJsonField = (field: string | null): any => {
  if (!field) return null;
  try {
    return JSON.parse(field);
  } catch {
    return null;
  }
};

// Fonction helper pour formater un partenaire avec les champs JSON parsés
const formatPartner = (partner: any) => {
  return {
    ...partner,
    menuImages: parseJsonField(partner.menuImages),
    photos: parseJsonField(partner.photos),
    marketingPrograms: parseJsonField(partner.marketingPrograms)
  };
};

/**
 * Formate un partenaire pour la réponse API avec tous les champs requis
 * Renvoie un objet propre et typé pour kashup-admin et kashup-mobile
 */
export const formatPartnerResponse = (partner: any) => {
  const formatted = formatPartner(partner);
  
  // Parser territories depuis JSON string
  const territories = parseJsonField(formatted.territories) || [];
  
  // Calculer isComplete : false si logoUrl ou shortDescription est null
  const isComplete = !!(formatted.logoUrl && formatted.shortDescription);
  
  const openingDaysParsed = (() => {
    const raw = formatted.openingDays;
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  })();
  return {
    id: formatted.id,
    name: formatted.name,
    slug: formatted.slug,
    siret: formatted.siret || null,
    phone: formatted.phone || null,
    openingHours: formatted.openingHours || null,
    openingDays: openingDaysParsed,
    address: formatted.address || null,
    territoryDetails: (() => {
      const raw = formatted.territoryDetails;
      if (!raw) return null;
      if (typeof raw === 'object' && raw !== null) return raw;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return typeof parsed === 'object' && parsed !== null ? parsed : null;
      } catch {
        return null;
      }
    })(),
    category: formatted.category ? {
      id: formatted.category.id,
      name: formatted.category.name
    } : null,
    territories: territories, // Array de territoires
    logoUrl: formatted.logoUrl || null,
    description: formatted.description || null,
    shortDescription: formatted.shortDescription || null,
    isComplete, // Champ calculé : true si logoUrl ET shortDescription sont présents
    websiteUrl: formatted.websiteUrl || null,
    facebookUrl: formatted.facebookUrl || null,
    instagramUrl: formatted.instagramUrl || null,
    tauxCashbackBase: formatted.tauxCashbackBase || 0,
    discoveryCashbackRate: formatted.discoveryCashbackRate ?? null,
    permanentCashbackRate: formatted.permanentCashbackRate ?? null,
    discoveryCashbackKashupShare: formatted.discoveryCashbackKashupShare ?? null,
    discoveryCashbackUserShare: formatted.discoveryCashbackUserShare ?? null,
    permanentCashbackKashupShare: formatted.permanentCashbackKashupShare ?? null,
    permanentCashbackUserShare: formatted.permanentCashbackUserShare ?? null,
    pointsPerTransaction: formatted.pointsPerTransaction ?? null,
    latitude: formatted.latitude || null,
    longitude: formatted.longitude || null,
    boostable: formatted.boostable ?? true,
    giftCardEnabled: formatted.giftCardEnabled ?? false,
    status: formatted.status || 'active',
    additionalInfo: formatted.additionalInfo || null,
    affiliations: formatted.affiliations || [],
    menuImages: formatted.menuImages || [],
    photos: formatted.photos || [],
    marketingPrograms: formatted.marketingPrograms || [],
    createdAt: formatted.createdAt || null,
    updatedAt: formatted.updatedAt || null
  };
};

/**
 * Liste les partenaires avec filtres, pagination et tri
 * 
 * @param filters - Filtres de recherche (tous optionnels)
 * @returns Objet avec data (array de partenaires) et pagination (métadonnées)
 * 
 * Gère automatiquement :
 * - Pagination (page, limit)
 * - Tri (sortBy, sortOrder)
 * - Filtres (search, categoryId, territory, etc.)
 * - Valeurs par défaut (page=1, limit=20, sortBy='name', sortOrder='desc')
 */
export const listPartners = async (filters: PartnerFilterInput, params: ListParams) => {
  const defaultResult = {
    data: [],
    meta: buildListMeta(0, params)
  };

  try {
    const baseWhere = buildWhere(filters);
    const { where, orderBy, skip, take } = buildListQuery(baseWhere, params, { softDelete: false });

    const [total, partners] = await Promise.all([
      safePrismaQuery(
        () => prisma.partner.count({ where }),
        0,
        15000,
        'listPartners.count'
      ),
      safePrismaQuery(
        () => prisma.partner.findMany({
          where,
          include: baseInclude,
          orderBy,
          skip,
          take
        }),
        [],
        15000,
        'listPartners.findMany'
      )
    ]);

    logger.debug({
      total,
      partnersCount: partners.length,
      whereClause: JSON.stringify(where),
      skip,
      take,
      orderBy
    }, '[listPartners] Données récupérées depuis Prisma');

    const formattedPartners = partners.map(formatPartnerResponse);
    
    logger.debug({
      formattedCount: formattedPartners.length,
      firstFormatted: formattedPartners[0] ? {
        id: formattedPartners[0].id,
        name: formattedPartners[0].name,
        hasCategory: !!formattedPartners[0].category
      } : null
    }, '[listPartners] Partenaires formatés');

    return {
      data: formattedPartners,
      meta: buildListMeta(total, params)
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      filters
    }, '[API] Prisma timeout – default response returned for listPartners');
    return defaultResult;
  }
};

export const getPartner = async (id: string) => {
  const partner = await prisma.partner.findUnique({
    where: { id },
    include: baseInclude
  });

  if (!partner) {
    throw new AppError('Partenaire introuvable', 404);
  }

  return formatPartnerResponse(partner);
};

export const createPartner = async (input: CreatePartnerInput) => {
  let partner: any = null;
  
  try {
    logger.info({ 
      name: input.name,
      categoryId: input.categoryId,
      territories: input.territories 
    }, '🔄 Création du partenaire dans la base de données');
    
    // Vérifier que la catégorie existe avant de créer
    const categoryExists = await prisma.partnerCategory.findUnique({
      where: { id: input.categoryId }
    });
    
    if (!categoryExists) {
      logger.error({ categoryId: input.categoryId }, '❌ Catégorie introuvable dans la base de données');
      throw new AppError(`La catégorie avec l'ID "${input.categoryId}" n'existe pas`, 404, {
        code: 'CATEGORY_NOT_FOUND',
        categoryId: input.categoryId
      });
    }
    
    logger.info({ categoryName: categoryExists.name }, '✅ Catégorie vérifiée');
    
    const slug = await ensureSlug(input.slug ?? input.name);
    logger.info({ slug }, '✅ Slug généré');

    logger.info({ 
      logoUrl: input.logoUrl,
      hasLogoUrl: !!input.logoUrl 
    }, '📸 logoUrl avant création en base');
    
    partner = await prisma.partner.create({
      data: {
        name: input.name,
        slug,
        logoUrl: input.logoUrl ?? null,
        shortDescription: input.shortDescription ?? null,
        description: input.description ?? null,
        siret: input.siret ?? null,
        phone: input.phone ?? null,
        openingHours: input.openingHours ?? null,
        openingDays: input.openingDays ?? null,
        address: input.address ?? null,
        websiteUrl: input.websiteUrl ?? null,
        facebookUrl: input.facebookUrl ?? null,
        instagramUrl: input.instagramUrl ?? null,
        territoryDetails: input.territoryDetails != null
          ? (typeof input.territoryDetails === 'string' ? input.territoryDetails : JSON.stringify(input.territoryDetails))
          : null,
        tauxCashbackBase: input.tauxCashbackBase,
        discoveryCashbackRate: input.discoveryCashbackRate ?? null,
        permanentCashbackRate: input.permanentCashbackRate ?? null,
        discoveryCashbackKashupShare: input.discoveryCashbackKashupShare ?? null,
        discoveryCashbackUserShare: input.discoveryCashbackUserShare ?? null,
        permanentCashbackKashupShare: input.permanentCashbackKashupShare ?? null,
        permanentCashbackUserShare: input.permanentCashbackUserShare ?? null,
        pointsPerTransaction: input.pointsPerTransaction ?? null,
        territories: input.territories ? JSON.stringify(input.territories) : JSON.stringify(['Martinique']), // Par défaut Martinique
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        boostable: input.boostable ?? true,
        giftCardEnabled: input.giftCardEnabled ?? false,
        categoryId: input.categoryId,
        status: input.status ?? 'active',
        additionalInfo: input.additionalInfo ? (typeof input.additionalInfo === 'string' ? input.additionalInfo : JSON.stringify(input.additionalInfo)) : null,
        affiliations: input.affiliations ? JSON.stringify(input.affiliations) : null,
        menuImages: input.menuImages ? JSON.stringify(input.menuImages) : null,
        photos: input.photos ? JSON.stringify(input.photos) : null,
        marketingPrograms: input.marketingPrograms ? JSON.stringify(input.marketingPrograms) : null
      },
      include: baseInclude
    });

    logger.info({ partnerId: partner.id, partnerName: partner.name }, '✅ Partenaire créé en base de données');

    // Formater le partenaire avant de retourner
    const formattedPartner = formatPartnerResponse(partner);
    
    // Déclencher le webhook pour synchroniser avec l'application mobile
    // Ne pas bloquer la réponse si le webhook échoue (fire and forget)
    emitPartnerWebhook('partner.created', formattedPartner).catch((webhookError) => {
      // Logger l'erreur mais ne pas faire échouer la création
      logger.warn({
        partnerId: partner.id,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError)
      }, '⚠️ Erreur lors de l\'émission du webhook (la création du partenaire a réussi)');
    });

    return formattedPartner;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.constructor.name : typeof error,
      input: {
        name: input.name,
        categoryId: input.categoryId,
        territories: input.territories
      }
    }, '❌ Erreur Prisma lors de la création du partenaire');
    
    // Gérer les erreurs Prisma spécifiques
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        const target = error.meta?.target as string[] | undefined;
        const field = target?.[0] || 'champ unique';
        throw new AppError(`Un partenaire avec ce ${field} existe déjà`, 409, {
          code: 'DUPLICATE_PARTNER',
          prismaCode: error.code,
          target: error.meta?.target
        });
      }
      if (error.code === 'P2003') {
        throw new AppError('La catégorie spécifiée n\'existe pas', 404, {
          code: 'CATEGORY_NOT_FOUND',
          prismaCode: error.code,
          field: error.meta?.field_name
        });
      }
    }
    
    // Propager l'erreur si c'est déjà une AppError
    if (error instanceof AppError) {
      throw error;
    }
    
    // Sinon, créer une AppError générique avec tous les détails
    throw new AppError(
      error instanceof Error ? error.message : 'Erreur lors de la création du partenaire',
      500,
      {
        code: 'PRISMA_ERROR',
        originalError: error instanceof Error ? error.message : String(error),
        prismaError: error instanceof Prisma.PrismaClientKnownRequestError 
          ? { code: error.code, meta: error.meta }
          : undefined
      }
    );
  }
};

export const updatePartner = async (id: string, input: UpdatePartnerInput) => {
  const existingPartner = await getPartner(id);

  let slug: string | undefined;
  if (input.slug || input.name) {
    slug = await ensureSlug(input.slug ?? input.name ?? '');
  }

  logger.info({ 
    logoUrl: input.logoUrl,
    hasLogoUrl: !!input.logoUrl,
    logoUrlType: typeof input.logoUrl
  }, '📸 logoUrl reçu dans updatePartner');
  
  const updateData: any = {
    name: input.name ?? undefined,
    slug: slug ?? undefined,
    logoUrl: input.logoUrl !== undefined ? (input.logoUrl || null) : undefined,
    shortDescription: input.shortDescription ?? undefined,
    description: input.description ?? undefined,
    siret: input.siret ?? undefined,
    phone: input.phone ?? undefined,
    openingHours: input.openingHours !== undefined ? (input.openingHours || null) : undefined,
    openingDays: input.openingDays !== undefined ? (input.openingDays || null) : undefined,
    address: input.address !== undefined ? (input.address || null) : undefined,
    websiteUrl: input.websiteUrl ?? undefined,
    facebookUrl: input.facebookUrl ?? undefined,
    instagramUrl: input.instagramUrl ?? undefined,
    territoryDetails: input.territoryDetails !== undefined
      ? (typeof input.territoryDetails === 'string' ? input.territoryDetails : JSON.stringify(input.territoryDetails))
      : undefined,
    tauxCashbackBase: input.tauxCashbackBase ?? undefined,
    discoveryCashbackRate: input.discoveryCashbackRate !== undefined ? (input.discoveryCashbackRate ?? null) : undefined,
    permanentCashbackRate: input.permanentCashbackRate !== undefined ? (input.permanentCashbackRate ?? null) : undefined,
    discoveryCashbackKashupShare: input.discoveryCashbackKashupShare !== undefined ? (input.discoveryCashbackKashupShare ?? null) : undefined,
    discoveryCashbackUserShare: input.discoveryCashbackUserShare !== undefined ? (input.discoveryCashbackUserShare ?? null) : undefined,
    permanentCashbackKashupShare: input.permanentCashbackKashupShare !== undefined ? (input.permanentCashbackKashupShare ?? null) : undefined,
    permanentCashbackUserShare: input.permanentCashbackUserShare !== undefined ? (input.permanentCashbackUserShare ?? null) : undefined,
    pointsPerTransaction: input.pointsPerTransaction !== undefined ? (input.pointsPerTransaction ?? null) : undefined,
    territories: input.territories ? JSON.stringify(input.territories) : undefined,
    latitude: input.latitude ?? undefined,
    longitude: input.longitude ?? undefined,
    boostable: input.boostable ?? undefined,
    giftCardEnabled: input.giftCardEnabled ?? undefined,
    categoryId: input.categoryId ?? undefined,
    status: input.status !== undefined ? (input.status || null) : undefined,
    additionalInfo: input.additionalInfo !== undefined ? (input.additionalInfo ? (typeof input.additionalInfo === 'string' ? input.additionalInfo : JSON.stringify(input.additionalInfo)) : null) : undefined,
    affiliations: input.affiliations !== undefined ? (input.affiliations ? JSON.stringify(input.affiliations) : null) : undefined
  };

  if (input.menuImages !== undefined) {
    updateData.menuImages = input.menuImages ? JSON.stringify(input.menuImages) : null;
  }
  if (input.photos !== undefined) {
    updateData.photos = input.photos ? JSON.stringify(input.photos) : null;
  }
  if (input.marketingPrograms !== undefined) {
    updateData.marketingPrograms = input.marketingPrograms ? JSON.stringify(input.marketingPrograms) : null;
  }

  logger.info({ 
    updateData: {
      ...updateData,
      logoUrl: updateData.logoUrl ? `${String(updateData.logoUrl).substring(0, 50)}...` : updateData.logoUrl
    }
  }, '💾 Données de mise à jour avant Prisma');
  
  const partner = await prisma.partner.update({
    where: { id },
    data: updateData,
    include: baseInclude
  });
  
  logger.info({ 
    partnerId: partner.id,
    logoUrl: partner.logoUrl,
    hasLogoUrl: !!partner.logoUrl
  }, '✅ Partenaire mis à jour en base de données');

  // Formater le partenaire avant de retourner
  const formattedPartner = formatPartnerResponse(partner);

  // Déclencher les webhooks appropriés
  await emitPartnerWebhook('partner.updated', formattedPartner).catch((webhookError) => {
    logger.warn({
      partnerId: partner.id,
      error: webhookError instanceof Error ? webhookError.message : String(webhookError)
    }, '⚠️ Erreur lors de l\'émission du webhook (la mise à jour du partenaire a réussi)');
  });

  return formattedPartner;
};

export const listCategories = () => {
  return prisma.partnerCategory.findMany({
    orderBy: { name: 'asc' }
  });
};

export const createCategory = (input: CategoryInput) => {
  return prisma.partnerCategory.create({ data: input });
};

export const updateCategory = async (id: string, input: CategoryInput) => {
  try {
    return await prisma.partnerCategory.update({
      where: { id },
      data: input
    });
  } catch (error) {
    throw new AppError('Catégorie introuvable', 404, (error as Error).message);
  }
};

export const deleteCategory = async (id: string) => {
  try {
    await prisma.partnerCategory.delete({ where: { id } });
  } catch (error) {
    throw new AppError('Catégorie introuvable', 404, (error as Error).message);
  }
};

export const getPartnerStatistics = async (id: string) => {
  await getPartner(id);

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

  // Transactions ce mois-ci
  const thisMonthStats = await prisma.transaction.aggregate({
    where: {
      partnerId: id,
      transactionDate: { gte: thisMonth }
    },
    _count: { _all: true },
    _avg: { amount: true },
    _sum: { amount: true, cashbackEarned: true }
  });

  // Transactions le mois dernier
  const lastMonthStats = await prisma.transaction.aggregate({
    where: {
      partnerId: id,
      transactionDate: { gte: lastMonth, lt: thisMonth }
    },
    _count: { _all: true },
    _avg: { amount: true },
    _sum: { amount: true, cashbackEarned: true }
  });

  // Transactions il y a deux mois (pour calculer la croissance)
  const twoMonthsAgoStats = await prisma.transaction.aggregate({
    where: {
      partnerId: id,
      transactionDate: { gte: twoMonthsAgo, lt: lastMonth }
    },
    _count: { _all: true },
    _avg: { amount: true }
  });

  const thisMonthCount = thisMonthStats._count._all ?? 0;
  const lastMonthCount = lastMonthStats._count._all ?? 0;
  const twoMonthsAgoCount = twoMonthsAgoStats._count._all ?? 0;

  // Calcul de la croissance du nombre de transactions
  let transactionGrowth = 0;
  if (lastMonthCount > 0 && twoMonthsAgoCount > 0) {
    transactionGrowth = ((lastMonthCount - twoMonthsAgoCount) / twoMonthsAgoCount) * 100;
  }

  // Calcul de la croissance du panier moyen
  const thisMonthAvg = thisMonthStats._avg.amount ?? 0;
  const lastMonthAvg = lastMonthStats._avg.amount ?? 0;
  let averageBasketGrowth = 0;
  if (lastMonthAvg > 0 && twoMonthsAgoStats._avg.amount && twoMonthsAgoStats._avg.amount > 0) {
    const twoMonthsAgoAvg = twoMonthsAgoStats._avg.amount;
    averageBasketGrowth = ((lastMonthAvg - twoMonthsAgoAvg) / twoMonthsAgoAvg) * 100;
  }

  return {
    thisMonth: {
      transactionCount: thisMonthCount,
      totalAmount: thisMonthStats._sum.amount ?? 0,
      averageBasket: thisMonthAvg,
      totalCashback: thisMonthStats._sum.cashbackEarned ?? 0
    },
    lastMonth: {
      transactionCount: lastMonthCount,
      totalAmount: lastMonthStats._sum.amount ?? 0,
      averageBasket: lastMonthAvg,
      totalCashback: lastMonthStats._sum.cashbackEarned ?? 0
    },
    growth: {
      transactionGrowth: Number(transactionGrowth.toFixed(2)),
      averageBasketGrowth: Number(averageBasketGrowth.toFixed(2))
    }
  };
};

/** Filtres pour le dashboard partenaire */
export type PartnerDashboardFilters = {
  groupBy?: 'day' | 'month';
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
};

/** Stats dashboard partenaire : CA, utilisateurs, par jour/mois, par genre, par tranche d'âge */
export const getPartnerDashboardStats = async (partnerId: string, filters: PartnerDashboardFilters = {}) => {
  await getPartner(partnerId);
  const { groupBy = 'month', from, to } = filters;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 2 mois en arrière
  const fromDate = from ? new Date(from + 'T00:00:00') : defaultFrom;
  const toDate = to ? new Date(to + 'T23:59:59') : now;

  const transactions = await prisma.transaction.findMany({
    where: {
      partnerId,
      status: 'confirmed',
      transactionDate: { gte: fromDate, lte: toDate }
    },
    include: {
      user: {
        select: { id: true, gender: true, ageRange: true }
      }
    },
    orderBy: { transactionDate: 'asc' }
  });

  const uniqueUserIds = new Set(transactions.map((t) => t.userId));
  const totalRevenue = transactions.reduce((s, t) => s + t.amount, 0);
  const totalCashback = transactions.reduce((s, t) => s + t.cashbackEarned, 0);

  // Séries par jour ou par mois
  const seriesMap = new Map<string, { count: number; revenue: number; users: Set<string> }>();
  const keyFormat = groupBy === 'day' ? (d: Date) => d.toISOString().slice(0, 10) : (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  for (const t of transactions) {
    const key = keyFormat(t.transactionDate);
    const cur = seriesMap.get(key) ?? { count: 0, revenue: 0, users: new Set<string>() };
    cur.count += 1;
    cur.revenue += t.amount;
    cur.users.add(t.userId);
    seriesMap.set(key, cur);
  }
  const series = Array.from(seriesMap.entries())
    .map(([period, v]) => ({ period, transactionCount: v.count, revenue: Math.round(v.revenue * 100) / 100, uniqueUsers: v.users.size }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Par genre
  const byGender: Record<string, { transactionCount: number; revenue: number; uniqueUsers: Set<string> }> = { M: { transactionCount: 0, revenue: 0, uniqueUsers: new Set() }, F: { transactionCount: 0, revenue: 0, uniqueUsers: new Set() }, other: { transactionCount: 0, revenue: 0, uniqueUsers: new Set() } };
  for (const t of transactions) {
    const g = (t.user?.gender && ['M', 'F', 'other'].includes(t.user.gender) ? t.user.gender : 'other') as 'M' | 'F' | 'other';
    byGender[g].transactionCount += 1;
    byGender[g].revenue += t.amount;
    byGender[g].uniqueUsers.add(t.userId);
  }
  const byGenderFormatted = {
    M: { transactionCount: byGender.M.transactionCount, revenue: Math.round(byGender.M.revenue * 100) / 100, uniqueUsers: byGender.M.uniqueUsers.size },
    F: { transactionCount: byGender.F.transactionCount, revenue: Math.round(byGender.F.revenue * 100) / 100, uniqueUsers: byGender.F.uniqueUsers.size },
    other: { transactionCount: byGender.other.transactionCount, revenue: Math.round(byGender.other.revenue * 100) / 100, uniqueUsers: byGender.other.uniqueUsers.size }
  };

  // Par tranche d'âge
  const ageRanges = ['18-25', '26-35', '36-50', '50+'];
  const byAgeRange: Record<string, { transactionCount: number; revenue: number; uniqueUsers: number }> = {};
  for (const ar of ageRanges) byAgeRange[ar] = { transactionCount: 0, revenue: 0, uniqueUsers: 0 };
  const ageRangeUsers: Record<string, Set<string>> = {};
  for (const ar of ageRanges) ageRangeUsers[ar] = new Set<string>();
  for (const t of transactions) {
    const ar = t.user?.ageRange && ageRanges.includes(t.user.ageRange) ? t.user.ageRange : 'non_renseigne';
    if (!byAgeRange[ar]) {
      byAgeRange[ar] = { transactionCount: 0, revenue: 0, uniqueUsers: 0 };
      ageRangeUsers[ar] = new Set<string>();
    }
    byAgeRange[ar].transactionCount += 1;
    byAgeRange[ar].revenue += t.amount;
    ageRangeUsers[ar].add(t.userId);
  }
  for (const k of Object.keys(byAgeRange)) {
    byAgeRange[k].revenue = Math.round(byAgeRange[k].revenue * 100) / 100;
    byAgeRange[k].uniqueUsers = ageRangeUsers[k]?.size ?? 0;
  }

  // Par jour de la semaine (0 = dimanche, 1 = lundi, ... 6 = samedi) et par genre
  const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const byDayOfWeek: Record<number, { M: number; F: number; other: number; total: number }> = {};
  for (let d = 0; d <= 6; d++) {
    byDayOfWeek[d] = { M: 0, F: 0, other: 0, total: 0 };
  }
  for (const t of transactions) {
    const day = t.transactionDate.getDay();
    const g = (t.user?.gender && ['M', 'F', 'other'].includes(t.user.gender) ? t.user.gender : 'other') as 'M' | 'F' | 'other';
    byDayOfWeek[day][g] += 1;
    byDayOfWeek[day].total += 1;
  }

  // Par heure (0-23) et par genre
  const byHour: Record<number, { M: number; F: number; other: number; total: number }> = {};
  for (let h = 0; h <= 23; h++) {
    byHour[h] = { M: 0, F: 0, other: 0, total: 0 };
  }
  for (const t of transactions) {
    const h = t.transactionDate.getHours();
    const g = (t.user?.gender && ['M', 'F', 'other'].includes(t.user.gender) ? t.user.gender : 'other') as 'M' | 'F' | 'other';
    byHour[h][g] += 1;
    byHour[h].total += 1;
  }

  // Top créneaux (jour + heure + genre) triés par nombre de transactions
  const slotMap = new Map<string, { dayOfWeek: number; hour: number; gender: string; count: number; revenue: number }>();
  for (const t of transactions) {
    const day = t.transactionDate.getDay();
    const hour = t.transactionDate.getHours();
    const g = (t.user?.gender && ['M', 'F', 'other'].includes(t.user.gender) ? t.user.gender : 'other') as string;
    const key = `${day}-${hour}-${g}`;
    const cur = slotMap.get(key) ?? { dayOfWeek: day, hour, gender: g, count: 0, revenue: 0 };
    cur.count += 1;
    cur.revenue += t.amount;
    slotMap.set(key, cur);
  }
  const topSlotsByGender = Array.from(slotMap.entries())
    .map(([, v]) => ({
      dayOfWeek: v.dayOfWeek,
      dayLabel: DAY_LABELS[v.dayOfWeek],
      hour: v.hour,
      gender: v.gender,
      transactionCount: v.count,
      revenue: Math.round(v.revenue * 100) / 100
    }))
    .sort((a, b) => b.transactionCount - a.transactionCount)
    .slice(0, 20);

  return {
    summary: {
      uniqueUsers: uniqueUserIds.size,
      totalTransactions: transactions.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCashback: Math.round(totalCashback * 100) / 100,
      averageBasket: transactions.length ? Math.round((totalRevenue / transactions.length) * 100) / 100 : 0
    },
    groupBy,
    series,
    byGender: byGenderFormatted,
    byAgeRange,
    byDayOfWeek: Object.entries(byDayOfWeek).map(([day, v]) => ({ day: Number(day), dayLabel: DAY_LABELS[Number(day)], ...v })),
    byHour: Object.entries(byHour).map(([hour, v]) => ({ hour: Number(hour), ...v })),
    topSlotsByGender
  };
};

export const deletePartner = async (id: string) => {
  const partner = await getPartner(id);
  
  // Supprimer le partenaire (les documents seront supprimés en cascade grâce à onDelete: Cascade)
  await prisma.partner.delete({
    where: { id }
  });
  
  logger.info({ partnerId: id, partnerName: partner.name }, '✅ Partenaire supprimé');
  
  // Déclencher le webhook pour synchroniser avec l'application mobile
  // Utiliser emitWebhook directement car 'partner.deleted' n'est pas dans les types
  await emitWebhook('partner.deleted', { id: partner.id }).catch((webhookError) => {
    logger.warn({
      partnerId: id,
      error: webhookError instanceof Error ? webhookError.message : String(webhookError)
    }, '⚠️ Erreur lors de l\'émission du webhook (la suppression du partenaire a réussi)');
  });
  
  return { deleted: true, id: partner.id };
};

export const listPartnerTerritories = () => {
  return TERRITORIES.map(territory => ({
    id: territory,
    name: territory,
    value: territory
  }));
};

export const getPartnerDocuments = async (id: string) => {
  await getPartner(id);

  return prisma.partnerDocument.findMany({
    where: { partnerId: id },
    orderBy: { createdAt: 'desc' }
  });
};

const DOCUMENT_TYPES = ['invoice', 'commercial_analysis', 'contract', 'other'] as const;

export const createPartnerDocument = async (
  partnerId: string,
  data: { name: string; type: string; url: string; size?: string }
) => {
  await getPartner(partnerId);
  const type = DOCUMENT_TYPES.includes(data.type as any) ? data.type : 'other';
  return prisma.partnerDocument.create({
    data: {
      partnerId,
      name: data.name,
      type,
      url: data.url,
      size: data.size ?? null,
    },
  });
};

export const deletePartnerDocument = async (partnerId: string, documentId: string) => {
  await getPartner(partnerId);
  const doc = await prisma.partnerDocument.findFirst({
    where: { id: documentId, partnerId },
  });
  if (!doc) {
    const { AppError } = await import('../utils/errors');
    throw new AppError('Document introuvable', 404, { code: 'PARTNER_DOCUMENT_NOT_FOUND' });
  }
  await prisma.partnerDocument.delete({ where: { id: documentId } });
  return doc;
};