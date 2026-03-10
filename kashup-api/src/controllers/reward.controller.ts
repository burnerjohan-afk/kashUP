import { Request, Response } from 'express';
import { createReward, deleteReward, listAllRewards, listBadges, listBoosts, purchaseBoost, updateReward } from '../services/reward.service';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sendSuccess } from '../utils/response';
import { processUploadedFile } from '../services/upload.service';
import { buildAbsoluteUrl } from '../utils/network';
import { parseListParams } from '../utils/listing';
import { rewardFormSchema, updateRewardFormSchema } from '../schemas/reward.schema';

function parseNum(v: unknown, def?: number): number | undefined {
  if (v === undefined || v === null || v === '') return def;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : def;
}

function parseStrArray(v: unknown): string[] | undefined {
  if (v == null || v === '') return undefined;
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string' && x.length > 0);
  if (typeof v === 'string') return v.trim() ? [v.trim()] : undefined;
  return undefined;
}

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).toLowerCase().trim();
  if (s === 'true' || s === 'on' || s === '1') return true;
  if (s === 'false' || s === 'off' || s === '0') return false;
  return undefined;
}

/** Convertit req.body (FormData → tout en string) en objet typé pour la validation. */
function parseRewardBody(body: Record<string, unknown>): Record<string, unknown> {
  const partnerIds = body['partnerIds[]'] !== undefined
    ? parseStrArray(body['partnerIds[]'])
    : parseStrArray(body.partnerIds);
  const challengePartnerIds = body['challengePartnerIds[]'] !== undefined
    ? parseStrArray(body['challengePartnerIds[]'])
    : parseStrArray(body.challengePartnerIds);
  const rawPartnerId = body.partnerId != null ? String(body.partnerId).trim() : '';
  const partnerIdFromBody = rawPartnerId && rawPartnerId !== 'undefined' && rawPartnerId !== 'null' ? rawPartnerId : undefined;
  const firstPartnerId = Array.isArray(partnerIds) && partnerIds.length > 0 ? partnerIds[0] : undefined;
  const partnerIdRaw = partnerIdFromBody ?? firstPartnerId;
  const partnerId = typeof partnerIdRaw === 'string' && partnerIdRaw.includes(',') ? partnerIdRaw.split(',')[0].trim() : partnerIdRaw;

  const out: Record<string, unknown> = {
    type: body.type,
    title: body.title,
    status: body.status,
    duration: body.duration !== undefined && body.duration !== '' ? parseNum(body.duration) : undefined,
    stock: body.stock !== undefined && body.stock !== '' ? parseNum(body.stock) : undefined,
    boostRate: body.boostRate !== undefined && body.boostRate !== '' ? parseNum(body.boostRate) : undefined,
    transactionCount: body.transactionCount !== undefined && body.transactionCount !== '' ? parseNum(body.transactionCount) : undefined,
    partnerCategory: body.partnerCategory && String(body.partnerCategory).trim() ? String(body.partnerCategory).trim() : undefined,
    partnerId: partnerId || undefined,
    partnerCategoryFilter: body.partnerCategoryFilter && String(body.partnerCategoryFilter).trim() ? String(body.partnerCategoryFilter).trim() : undefined,
    userType: body.userType && String(body.userType).trim() ? String(body.userType).trim() : undefined,
    partnerIds: partnerIds?.length ? partnerIds : undefined,
    startAt: body.startAt && String(body.startAt).trim() ? String(body.startAt).trim() : undefined,
    endAt: body.endAt && String(body.endAt).trim() ? String(body.endAt).trim() : undefined,
    pointsRequired: body.pointsRequired !== undefined && body.pointsRequired !== '' ? parseNum(body.pointsRequired) : undefined,
    maxTicketsPerUser: (body.maxTicketsPerUser !== undefined && body.maxTicketsPerUser !== '' && body.maxTicketsPerUser != null)
      ? parseNum(body.maxTicketsPerUser)
      : (Object.prototype.hasOwnProperty.call(body, 'maxTicketsPerUser') ? null : undefined),
    rules: body.rules && String(body.rules).trim() ? String(body.rules).trim() : undefined,
    category: body.category && String(body.category).trim() ? String(body.category).trim() : undefined,
    challengePartnerCategory: body.challengePartnerCategory && String(body.challengePartnerCategory).trim() ? String(body.challengePartnerCategory).trim() : undefined,
    challengePartnerIds: challengePartnerIds?.length ? challengePartnerIds : undefined,
    challengeStartAt: body.challengeStartAt && String(body.challengeStartAt).trim() ? String(body.challengeStartAt).trim() : undefined,
    challengeEndAt: body.challengeEndAt && String(body.challengeEndAt).trim() ? String(body.challengeEndAt).trim() : undefined,
    challengeTransactionCount: body.challengeTransactionCount !== undefined && body.challengeTransactionCount !== '' ? parseNum(body.challengeTransactionCount) : undefined,
    challengeRewardPoints: body.challengeRewardPoints !== undefined && body.challengeRewardPoints !== '' ? parseNum(body.challengeRewardPoints) : undefined,
    conditions: Object.prototype.hasOwnProperty.call(body, 'conditions') ? String(body.conditions ?? '').trim() : undefined,
    // Loteries : lots, date tirage, visibilité
    drawDate: body.drawDate && String(body.drawDate).trim() ? String(body.drawDate).trim() : undefined,
    totalTicketsAvailable: (body.totalTicketsAvailable !== undefined && body.totalTicketsAvailable !== '' && body.totalTicketsAvailable != null)
      ? parseNum(body.totalTicketsAvailable)
      : (Object.prototype.hasOwnProperty.call(body, 'totalTicketsAvailable') ? null : undefined),
    isTicketStockLimited: parseBool(body.isTicketStockLimited),
    showOnHome: parseBool(body.showOnHome),
    showOnRewards: parseBool(body.showOnRewards),
    prizeType: body.prizeType && String(body.prizeType).trim() ? String(body.prizeType).trim() : undefined,
    prizeTitle: body.prizeTitle && String(body.prizeTitle).trim() ? String(body.prizeTitle).trim() : undefined,
    prizeDescription: body.prizeDescription && String(body.prizeDescription).trim() ? String(body.prizeDescription).trim() : undefined,
    prizeValue: body.prizeValue !== undefined && body.prizeValue !== '' ? parseNum(body.prizeValue) : undefined,
    prizeCurrency: body.prizeCurrency && String(body.prizeCurrency).trim() ? String(body.prizeCurrency).trim() : undefined,
    shortDescription: body.shortDescription && String(body.shortDescription).trim() ? String(body.shortDescription).trim() : undefined,
  };
  return out;
}

function normalizeUploadPath(pathOrUrl: string): string {
  return pathOrUrl.replace(/\/upload\//g, '/uploads/').replace(/^\/upload(\/|$)/, '/uploads$1');
}

function withAbsoluteRewardImageUrl<T extends { imageUrl?: string | null }>(req: Request, item: T): T {
  const raw = item.imageUrl;
  if (!raw || typeof raw !== 'string' || (raw as string).trim() === '') {
    return item;
  }
  let path = (raw as string).trim();
  path = normalizeUploadPath(path);
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { ...item, imageUrl: path };
  }
  return { ...item, imageUrl: buildAbsoluteUrl(req, path.startsWith('/') ? path : `/${path}`) };
}

export const getBoosts = asyncHandler(async (req: Request, res: Response) => {
  const listParams = parseListParams(req.query);
  const result = await listBoosts(listParams);
  sendSuccess(res, result.data, { pagination: result.meta });
});

export const purchaseBoostHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError('Authentification requise', 401);
  }
  const result = await purchaseBoost(req.user.sub, { boostId: req.params.id });
  res.json(result);
});

// Contrôleurs admin
export const getAllRewards = asyncHandler(async (req: Request, res: Response) => {
  const type = req.query.type as 'boost' | 'badge' | 'lottery' | 'challenge' | undefined;
  const listParams = parseListParams(req.query);
  const result = await listAllRewards(listParams, type);
  const dataWithAbsoluteImageUrls = (result.data as { imageUrl?: string | null }[]).map((item) =>
    withAbsoluteRewardImageUrl(req, item)
  );
  sendSuccess(res, dataWithAbsoluteImageUrls, { pagination: result.meta });
});

export const getRewardsByType = asyncHandler(async (req: Request, res: Response) => {
  const type = req.params.type as 'boost' | 'badge' | 'lottery' | 'challenge';
  if (!['boost', 'badge', 'lottery', 'challenge'].includes(type)) {
    throw new AppError('Type de récompense invalide', 400);
  }
  const listParams = parseListParams(req.query);
  const result = await listAllRewards(listParams, type);
  const dataWithAbsoluteImageUrls = (result.data as { imageUrl?: string | null }[]).map((item) =>
    withAbsoluteRewardImageUrl(req, item)
  );
  sendSuccess(res, dataWithAbsoluteImageUrls, { pagination: result.meta });
});

export const createRewardHandler = asyncHandler(async (req: Request, res: Response) => {
  const fileUrl = req.file ? await processUploadedFile(req.file, 'rewards') : undefined;
  const imageUrl = (fileUrl != null && fileUrl !== '') ? fileUrl : (req.body.imageUrl as string | undefined);
  const processed = { ...parseRewardBody(req.body as Record<string, unknown>), imageUrl: imageUrl || (req.body.imageUrl as string) || undefined };
  const result = rewardFormSchema.safeParse(processed);
  if (!result.success) {
    throw new AppError('Données invalides', 422, {
      code: 'VALIDATION_ERROR',
      details: result.error.flatten(),
    });
  }
  const reward = await createReward(result.data, imageUrl);
  sendSuccess(res, withAbsoluteRewardImageUrl(req, reward), null, 201);
});

export const updateRewardHandler = asyncHandler(async (req: Request, res: Response) => {
  const type = (req.body.type || req.query.type) as string;
  if (!type) {
    throw new AppError('Type de récompense requis', 400);
  }
  const fileUrl = req.file ? await processUploadedFile(req.file, 'rewards') : undefined;
  const imageUrl = (fileUrl != null && fileUrl !== '') ? fileUrl : (req.body.imageUrl as string | undefined);
  const processed = { ...parseRewardBody(req.body as Record<string, unknown>), imageUrl: imageUrl || (req.body.imageUrl as string) || undefined };
  const result = updateRewardFormSchema.safeParse(processed);
  if (!result.success) {
    throw new AppError('Données invalides', 422, {
      code: 'VALIDATION_ERROR',
      details: result.error.flatten(),
    });
  }
  const reward = await updateReward(req.params.id, type, result.data, imageUrl);
  sendSuccess(res, withAbsoluteRewardImageUrl(req, reward));
});

export const deleteRewardHandler = asyncHandler(async (req: Request, res: Response) => {
  const type = (req.body?.type || req.query.type) as string;
  if (!type || !['boost', 'badge', 'lottery', 'challenge'].includes(type)) {
    throw new AppError('Type de récompense requis et valide (boost, badge, lottery, challenge)', 400);
  }
  const result = await deleteReward(req.params.id, type);
  sendSuccess(res, result);
});

export const getBadges = asyncHandler(async (req: Request, res: Response) => {
  const listParams = parseListParams(req.query);
  const result = await listBadges(listParams);
  sendSuccess(res, result.data, { pagination: result.meta });
});


