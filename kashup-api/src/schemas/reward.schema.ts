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
  // Loteries
  partnerIds: z.array(z.string()).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  pointsRequired: z.number().positive().optional(),
  maxTicketsPerUser: z.number().positive().nullable().optional(),
  rules: z.string().optional(),
  // Défis
  challengePartnerCategory: z.string().optional(),
  challengePartnerIds: z.array(z.string()).optional(),
  challengeStartAt: z.string().optional(),
  challengeEndAt: z.string().optional(),
  challengeTransactionCount: z.number().positive().optional(),
  // Commun
  conditions: z.string().optional()
}).refine((data) => {
  if (data.type === 'badge') {
    return data.transactionCount !== undefined && data.partnerCategory !== undefined && data.partnerCategory !== '';
  }
  if (data.type === 'lottery' || data.type === 'challenge' || data.type === 'boost') {
    return data.stock !== undefined;
  }
  return true;
}, {
  message: 'Les champs requis pour ce type de récompense sont manquants'
}).refine((data) => {
  if (data.type === 'boost') {
    return (data.partnerId !== undefined && data.partnerId !== '') ||
           (data.partnerCategoryFilter !== undefined && data.partnerCategoryFilter !== '');
  }
  return true;
}, {
  message: 'Un boost doit avoir un partenaire ou une catégorie de partenaire'
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
           data.challengeEndAt !== undefined && data.challengeEndAt !== '' &&
           data.challengeTransactionCount !== undefined;
  }
  return true;
}, {
  message: 'Un défi doit avoir des dates de début/fin et un nombre de transactions requis'
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
  pointsRequired: z.number().positive().optional(),
  maxTicketsPerUser: z.number().positive().nullable().optional(),
  rules: z.string().optional(),
  challengePartnerCategory: z.string().optional(),
  challengePartnerIds: z.array(z.string()).optional(),
  challengeStartAt: z.string().optional(),
  challengeEndAt: z.string().optional(),
  challengeTransactionCount: z.number().positive().optional(),
  conditions: z.string().optional()
});

export type UpdateRewardFormInput = z.infer<typeof updateRewardFormSchema>;
