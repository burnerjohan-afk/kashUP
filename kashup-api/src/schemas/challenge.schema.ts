import { z } from 'zod';

const challengeCategories = [
  'consentements',
  'parrainages',
  'cagnotte',
  'achats',
  'connexion',
  'ma_fid',
] as const;

const challengeTypes = [
  'challenge_purchase',
  'challenge_spend',
  'challenge_discovery',
  'challenge_loyalty',
  'challenge_invite',
  'challenge_geo',
  'challenge_event',
] as const;

const rewardTypes = ['cashback', 'points', 'gift_card', 'voucher', 'badge', 'boost'] as const;

export const createChallengeRewardSchema = z.object({
  rewardType: z.enum(rewardTypes),
  rewardValue: z.number().min(0),
  rewardCurrency: z.string().optional().default('EUR'),
  expirationDays: z.number().int().min(0).optional(),
});

export const createChallengeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.enum(challengeCategories).optional(),
  type: z.enum(challengeTypes).default('challenge_purchase'),
  goalType: z.string().min(1),
  goalValue: z.number().int().min(1),
  rewardPoints: z.number().int().min(0).optional().default(0),
  rewardId: z.string().cuid().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional().default('medium'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  status: z.enum(['upcoming', 'active', 'ended']).optional().default('active'),
  partnerId: z.string().cuid().optional(),
});

export const updateChallengeSchema = createChallengeSchema.partial();

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
export type CreateChallengeRewardInput = z.infer<typeof createChallengeRewardSchema>;
