import { z } from 'zod';

export const purchaseBoostSchema = z.object({
  boostId: z.string().cuid()
});

export type PurchaseBoostInput = z.infer<typeof purchaseBoostSchema>;

// Schéma pour créer/mettre à jour une récompense selon la documentation
export const rewardFormSchema = z.object({
  type: z.enum(['boost', 'badge', 'lottery', 'challenge']),
  title: z.string().min(3),
  duration: z.number().positive().optional(),
  stock: z.number().positive().optional(),
  boostRate: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'active', 'archived']),
  image: z.any().optional(), // File upload
  // URL ou chemin relatif après upload (ex. /uploads/rewards/xxx.jpg)
  imageUrl: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  // Badges
  transactionCount: z.number().positive().optional(),
  partnerCategory: z.string().optional(),
  // Boosts
  partnerId: z.string().optional(),
  partnerCategoryFilter: z.string().optional(),
  userType: z.string().optional(),
  // Loteries (partnerId partagé avec Boosts)
  partnerIds: z.array(z.string()).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  drawDate: z.string().optional(),
  pointsRequired: z.number().positive().optional(),
  isTicketStockLimited: z.boolean().optional(),
  totalTicketsAvailable: z.preprocess(
    (v) => (v === '' || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.number().int().positive().nullable().optional()
  ),
  maxTicketsPerUser: z.number().positive().nullable().optional(),
  showOnHome: z.boolean().optional(),
  showOnRewards: z.boolean().optional(),
  prizeType: z.string().optional(),
  prizeTitle: z.string().optional(),
  prizeDescription: z.string().optional(),
  prizeValue: z.number().optional(),
  prizeCurrency: z.string().optional(),
  shortDescription: z.string().optional(),
  rules: z.string().optional(),
  // Défis (menu Badges & points)
  category: z.string().optional(),
  challengePartnerCategory: z.string().optional(),
  challengePartnerIds: z.array(z.string()).optional(),
  challengeStartAt: z.string().optional(),
  challengeEndAt: z.string().optional(),
  challengeTransactionCount: z.number().int().min(0).optional(),
  challengeRewardPoints: z.number().int().min(0).optional(),
  // Commun
  conditions: z.string().optional()
}).refine((data) => {
  if (data.type === 'badge') {
    return data.transactionCount !== undefined && data.partnerCategory !== undefined && data.partnerCategory !== '';
  }
  if (data.type === 'challenge' || data.type === 'boost') {
    return data.stock !== undefined;
  }
  return true;
}, {
  message: 'Les champs requis pour ce type de récompense sont manquants'
}).refine((data) => {
  if (data.type === 'lottery') {
    return data.startAt !== undefined && data.startAt !== '' &&
           data.endAt !== undefined && data.endAt !== '' &&
           data.pointsRequired !== undefined;
  }
  return true;
}, {
  message: 'Une loterie doit avoir des dates de début/fin et un nombre de points requis'
}).refine((data) => {
  if (data.type === 'challenge') {
    return data.challengeStartAt !== undefined && data.challengeStartAt !== '' &&
           data.challengeEndAt !== undefined && data.challengeEndAt !== '';
  }
  return true;
}, {
  message: 'Un défi doit avoir des dates de début et de fin'
});

export type RewardFormInput = z.infer<typeof rewardFormSchema>;

// Schéma pour la mise à jour (tous les champs optionnels)
// On crée un nouveau schéma car .partial() ne fonctionne pas avec ZodEffects
export const updateRewardFormSchema = z.object({
  type: z.enum(['boost', 'badge', 'lottery', 'challenge']).optional(),
  title: z.string().min(3).optional(),
  duration: z.number().positive().optional(),
  stock: z.number().positive().optional(),
  boostRate: z.number().min(0).max(100).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  image: z.any().optional(),
  imageUrl: z.string().min(1).optional().or(z.literal('').transform(() => undefined)),
  transactionCount: z.number().positive().optional(),
  partnerCategory: z.string().optional(),
  partnerId: z.string().optional(),
  partnerCategoryFilter: z.string().optional(),
  userType: z.string().optional(),
  partnerIds: z.array(z.string()).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  drawDate: z.string().optional(),
  pointsRequired: z.number().positive().optional(),
  isTicketStockLimited: z.boolean().optional(),
  totalTicketsAvailable: z.preprocess(
    (v) => (v === '' || v === undefined || (typeof v === 'number' && Number.isNaN(v)) ? undefined : v),
    z.number().int().positive().nullable().optional()
  ),
  maxTicketsPerUser: z.number().positive().nullable().optional(),
  showOnHome: z.boolean().optional(),
  showOnRewards: z.boolean().optional(),
  prizeType: z.string().optional(),
  prizeTitle: z.string().optional(),
  prizeDescription: z.string().optional(),
  prizeValue: z.number().optional(),
  prizeCurrency: z.string().optional(),
  shortDescription: z.string().optional(),
  rules: z.string().optional(),
  category: z.string().optional(),
  challengePartnerCategory: z.string().optional(),
  challengePartnerIds: z.array(z.string()).optional(),
  challengeStartAt: z.string().optional(),
  challengeEndAt: z.string().optional(),
  challengeTransactionCount: z.number().int().min(0).optional(),
  challengeRewardPoints: z.number().int().min(0).optional(),
  conditions: z.string().optional()
});

export type UpdateRewardFormInput = z.infer<typeof updateRewardFormSchema>;
