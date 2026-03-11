import { z } from 'zod';
import { deleteStandardJson, getJson, getStandardJson, patchStandardJson, postJson, postStandardJson } from '@/lib/api/client';
import { unwrapResponse, unwrapStandardResponse } from '@/lib/api/response';
import type { Reward } from '@/types/entities';

export type RewardsResponse = {
  boosts: Reward[];
  badges: Reward[];
  lotteries: Reward[];
  challenges: Reward[];
};

const partnerCategories = [
  'Restauration',
  'Beauté et Bien-être',
  'Loisir',
  'Retail',
  'Mobilité',
  'Culture',
  'Sport',
  'Mode',
  'Électronique',
  'Services',
  'Autre',
] as const;

const userTypes = [
  'Tous',
  'Nouveaux utilisateurs',
  'Utilisateurs actifs',
  'Utilisateurs inactifs',
  'Utilisateurs premium',
  'Utilisateurs jeunes (18-25)',
  'Utilisateurs adultes (26-40)',
  'Utilisateurs seniors (41+)',
] as const;

export const rewardFormSchema = z
  .object({
    type: z.enum(['boost', 'badge', 'lottery', 'challenge']),
    title: z.string().min(3),
    duration: z.number().positive(),
    stock: z.number().positive().optional(),
    boostRate: z.number().min(0).max(100).optional(),
    status: z.enum(['draft', 'active', 'archived']),
    image: z.instanceof(File).optional(),
    // Champs spécifiques aux badges
    transactionCount: z.number().positive().optional(),
    partnerCategory: z.string().optional(),
    // Champs spécifiques aux boosts
    partnerId: z.string().optional(),
    partnerCategoryFilter: z.string().optional(),
    userType: z.string().optional(),
    // Champs spécifiques aux loteries
    partnerIds: z.array(z.string()).optional(),
    startAt: z.string().optional(),
    endAt: z.string().optional(),
    drawDate: z.string().optional(),
    pointsRequired: z.number().positive().optional(),
    maxTicketsPerUser: z.number().positive().nullable().optional(),
    totalTicketsAvailable: z.preprocess(
      (v) => (v === '' || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
      z.number().int().positive().nullable().optional()
    ),
    isTicketStockLimited: z.boolean().optional(),
    showOnHome: z.boolean().optional(),
    showOnRewards: z.boolean().optional(),
    prizeType: z.string().optional(),
    prizeTitle: z.string().optional(),
    prizeDescription: z.string().optional(),
    prizeValue: z.number().optional(),
    prizeCurrency: z.string().optional(),
    shortDescription: z.string().optional(),
    rules: z.string().optional(),
    imageUrl: z.string().optional(),
    // Champs spécifiques aux défis
    category: z.string().optional(),
    challengePartnerCategory: z.string().optional(),
    challengePartnerIds: z.array(z.string()).optional(),
    challengeStartAt: z.string().optional(),
    challengeEndAt: z.string().optional(),
    challengeTransactionCount: z.number().int().min(0).optional(),
    challengeRewardPoints: z.number().int().min(0).optional(),
    // Champ commun pour les conditions
    conditions: z.string().optional(),
  })
  .refine(
    (data) => {
      // Pour les badges : transactionCount et partnerCategory sont requis, stock n'est pas requis
      if (data.type === 'badge') {
        return (
          data.transactionCount !== undefined &&
          data.partnerCategory !== undefined &&
          data.partnerCategory !== ''
        );
      }
      // Pour les loteries : stock optionnel (valeur par défaut côté form). Pour les challenges : stock requis
      if (data.type === 'challenge') {
        return data.stock !== undefined;
      }
      // Pour les boosts : stock est requis
      if (data.type === 'boost') {
        return data.stock !== undefined;
      }
      return true;
    },
    {
      message: 'Les badges nécessitent un nombre de transactions et un type de partenaire',
      path: ['transactionCount'],
    },
  )
  .refine(
    (data) => {
      // Pour les loteries : startAt, endAt, pointsRequired sont requis
      if (data.type === 'lottery') {
        return (
          data.startAt !== undefined &&
          data.startAt !== '' &&
          data.endAt !== undefined &&
          data.endAt !== '' &&
          data.pointsRequired !== undefined
        );
      }
      return true;
    },
    {
      message: 'Les loteries nécessitent une date de début, une date de fin et un nombre de points',
      path: ['startAt'],
    },
  )
  .refine(
    (data) => {
      // Pour les défis : uniquement challengeStartAt et challengeEndAt sont requis (nombre de transactions optionnel)
      if (data.type === 'challenge') {
        return (
          data.challengeStartAt !== undefined &&
          data.challengeStartAt !== '' &&
          data.challengeEndAt !== undefined &&
          data.challengeEndAt !== ''
        );
      }
      return true;
    },
    {
      message: 'Les défis nécessitent une date de début et une date de fin',
      path: ['challengeStartAt'],
    },
  );

export type RewardFormInput = z.infer<typeof rewardFormSchema>;

export const PARTNER_CATEGORIES = partnerCategories;
export const USER_TYPES = userTypes;

/** Catégories du menu Badges & points (défis) — alignées avec l’API */
export const CHALLENGE_CATEGORIES = [
  { value: '', label: '— Non défini (dérivé du type) —' },
  { value: 'consentements', label: 'Consentements' },
  { value: 'parrainages', label: 'Parrainages' },
  { value: 'cagnotte', label: 'Cagnotte' },
  { value: 'achats', label: 'Challenges' },
  { value: 'connexion', label: 'Connexion' },
  { value: 'ma_fid', label: 'Ma fidélité' },
] as const;

export const fetchRewardsCatalog = async () => {
  const response = await getJson<RewardsResponse>('rewards');
  return unwrapResponse(response);
};

export const fetchRewardsByType = async (type: 'boost' | 'badge' | 'lottery' | 'challenge') => {
  // Utiliser getStandardJson car le handler MSW retourne StandardResponse
  const response = await getStandardJson<Reward[]>(`rewards/${type}`);
  return unwrapStandardResponse(response);
};

/** Construit un FormData pour une loterie (création ou mise à jour). image peut être un File ou absent (pour mise à jour sans nouvelle image). */
function buildRewardFormData(
  payload: Partial<RewardFormInput> & { type: string; title: string; image?: File },
  forUpdate?: boolean
): FormData {
  const formData = new FormData();
  formData.append('type', payload.type);
  formData.append('title', payload.title);
  if (payload.duration !== undefined) {
    formData.append('duration', String(payload.duration));
  }
  if (payload.stock !== undefined) {
    formData.append('stock', String(payload.stock));
  }
  if (payload.status) {
    formData.append('status', payload.status);
  }
  if (payload.boostRate !== undefined) {
    formData.append('boostRate', String(payload.boostRate));
  }
  if (payload.transactionCount !== undefined) {
    formData.append('transactionCount', String(payload.transactionCount));
  }
  if (payload.partnerCategory) {
    formData.append('partnerCategory', payload.partnerCategory);
  }
  if (payload.partnerId) {
    formData.append('partnerId', payload.partnerId);
  }
  if (payload.partnerCategoryFilter) {
    formData.append('partnerCategoryFilter', payload.partnerCategoryFilter);
  }
  if (payload.userType) {
    formData.append('userType', payload.userType);
  }
  if (payload.partnerIds && payload.partnerIds.length > 0) {
    payload.partnerIds.forEach((id) => formData.append('partnerIds[]', id));
    if (payload.type === 'lottery') {
      formData.append('partnerId', payload.partnerIds[0]);
    }
  }
  if (payload.partnerId && !payload.partnerIds?.length) {
    formData.append('partnerId', payload.partnerId);
  }
  if (payload.startAt) {
    formData.append('startAt', payload.startAt);
  }
  if (payload.endAt) {
    formData.append('endAt', payload.endAt);
  }
  if (payload.pointsRequired !== undefined) {
    formData.append('pointsRequired', String(payload.pointsRequired));
  }
  if (payload.maxTicketsPerUser !== undefined && payload.maxTicketsPerUser !== null) {
    formData.append('maxTicketsPerUser', String(payload.maxTicketsPerUser));
  }
  if (payload.drawDate) {
    formData.append('drawDate', payload.drawDate);
  }
  if (payload.type === 'lottery') {
    formData.append('totalTicketsAvailable', (payload.totalTicketsAvailable != null && payload.totalTicketsAvailable !== '') ? String(payload.totalTicketsAvailable) : '');
    formData.append('isTicketStockLimited', (payload.isTicketStockLimited ?? false) ? 'true' : 'false');
    formData.append('showOnHome', (payload.showOnHome ?? true) ? 'true' : 'false');
    formData.append('showOnRewards', (payload.showOnRewards ?? true) ? 'true' : 'false');
    formData.append('prizeTitle', payload.prizeTitle ?? '');
    formData.append('prizeDescription', payload.prizeDescription ?? '');
    formData.append('prizeType', payload.prizeType ?? '');
    formData.append('prizeValue', payload.prizeValue !== undefined && payload.prizeValue !== null ? String(payload.prizeValue) : '');
    formData.append('prizeCurrency', payload.prizeCurrency ?? 'EUR');
    formData.append('shortDescription', payload.shortDescription ?? '');
    formData.append('rules', payload.rules ?? '');
    if (payload.maxTicketsPerUser !== undefined) {
      formData.append('maxTicketsPerUser', payload.maxTicketsPerUser != null ? String(payload.maxTicketsPerUser) : '');
    }
  } else {
    if (payload.totalTicketsAvailable !== undefined && payload.totalTicketsAvailable !== null) {
      formData.append('totalTicketsAvailable', String(payload.totalTicketsAvailable));
    }
    if (payload.isTicketStockLimited !== undefined) {
      formData.append('isTicketStockLimited', payload.isTicketStockLimited ? 'true' : 'false');
    }
    if (payload.showOnHome !== undefined) {
      formData.append('showOnHome', payload.showOnHome ? 'true' : 'false');
    }
    if (payload.showOnRewards !== undefined) {
      formData.append('showOnRewards', payload.showOnRewards ? 'true' : 'false');
    }
    if (payload.prizeTitle) {
      formData.append('prizeTitle', payload.prizeTitle);
    }
    if (payload.prizeDescription) {
      formData.append('prizeDescription', payload.prizeDescription);
    }
    if (payload.prizeType) {
      formData.append('prizeType', payload.prizeType);
    }
    if (payload.prizeValue !== undefined) {
      formData.append('prizeValue', String(payload.prizeValue));
    }
    if (payload.prizeCurrency) {
      formData.append('prizeCurrency', payload.prizeCurrency);
    }
    if (payload.shortDescription) {
      formData.append('shortDescription', payload.shortDescription);
    }
    if (payload.rules) {
      formData.append('rules', payload.rules);
    }
  }
  if (payload.category) {
    formData.append('category', payload.category);
  }
  if (payload.challengePartnerCategory) {
    formData.append('challengePartnerCategory', payload.challengePartnerCategory);
  }
  if (payload.challengePartnerIds && payload.challengePartnerIds.length > 0) {
    payload.challengePartnerIds.forEach((id) => formData.append('challengePartnerIds[]', id));
  }
  if (payload.challengeStartAt) {
    formData.append('challengeStartAt', payload.challengeStartAt);
  }
  if (payload.challengeEndAt) {
    formData.append('challengeEndAt', payload.challengeEndAt);
  }
  if (payload.challengeTransactionCount !== undefined) {
    formData.append('challengeTransactionCount', String(payload.challengeTransactionCount));
  }
  if (payload.challengeRewardPoints !== undefined) {
    formData.append('challengeRewardPoints', String(payload.challengeRewardPoints));
  }
  // Toujours envoyer conditions pour loterie (règlement) ; pour les autres types si présent
  if (payload.type === 'lottery') {
    formData.append('conditions', payload.conditions ?? '');
  } else if (payload.conditions) {
    formData.append('conditions', payload.conditions);
  }
  // Image : conserver l'URL complète (Blob ou relative) pour que les loteries gardent l'URL Blob en base
  if (payload.imageUrl && typeof payload.imageUrl === 'string' && payload.imageUrl.trim() !== '') {
    formData.append('imageUrl', payload.imageUrl.trim());
  }
  if (payload.image instanceof File) {
    formData.append('image', payload.image);
  }
  return formData;
}

export const createReward = async (payload: RewardFormInput) => {
  if (payload.type === 'lottery' || payload.image instanceof File) {
    const formData = buildRewardFormData(
      { ...payload, image: payload.image instanceof File ? payload.image : undefined },
      false
    );
    const response = await postStandardJson<Reward>('rewards', formData);
    return unwrapStandardResponse(response);
  }
  const response = await postStandardJson<Reward>('rewards', payload);
  return unwrapStandardResponse(response);
};

export const updateReward = async (rewardId: string, payload: Partial<RewardFormInput>) => {
  const image = (payload as Partial<RewardFormInput> & { image?: unknown }).image;
  const type = payload.type;
  const title = payload.title;
  if (type === 'lottery' && type && title) {
    const formData = buildRewardFormData(
      { ...payload, type, title, image: image instanceof File ? image : undefined },
      true
    );
    const response = await patchStandardJson<Reward>(`rewards/${rewardId}`, formData);
    return unwrapStandardResponse(response);
  }
  if (image instanceof File && type && title) {
    const formData = buildRewardFormData({ ...payload, type, title, image });
    const response = await patchStandardJson<Reward>(`rewards/${rewardId}`, formData);
    return unwrapStandardResponse(response);
  }
  const { image: _image, ...rest } = payload as Partial<RewardFormInput> & { image?: unknown };
  const response = await patchStandardJson<Reward>(`rewards/${rewardId}`, rest);
  return unwrapStandardResponse(response);
};

export const deleteReward = async (rewardId: string, type: 'boost' | 'badge' | 'lottery' | 'challenge') => {
  const response = await deleteStandardJson(`rewards/${rewardId}?type=${encodeURIComponent(type)}`);
  if (!response.success) {
    throw new Error(response.message ?? 'Impossible de supprimer la récompense');
  }
  return response;
};

export const purchaseBoost = async (rewardId: string) => {
  const response = await postJson<Reward>(`rewards/boosts/${rewardId}/purchase`);
  return unwrapResponse(response);
};

export const joinLottery = async (rewardId: string) => {
  const response = await postJson<Reward>(`rewards/lotteries/${rewardId}/join`);
  return unwrapResponse(response);
};

