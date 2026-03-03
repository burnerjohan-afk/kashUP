export const USER_ROLES = ['user', 'admin', 'partner'] as const;
export const USER_ROLE = {
  user: 'user',
  admin: 'admin',
  partner: 'partner'
} as const;
export type UserRole = (typeof USER_ROLES)[number];

export const TERRITORIES = ['Martinique', 'Guadeloupe', 'Guyane'] as const;
export type Territory = (typeof TERRITORIES)[number];

export const TRANSACTION_SOURCES = ['carte', 'virement', 'manuel'] as const;
export type TransactionSource = (typeof TRANSACTION_SOURCES)[number];

export const TRANSACTION_STATUSES = ['pending', 'confirmed', 'cancelled'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const BOOST_TARGETS = ['all', 'category', 'partner'] as const;
export const BOOST_TARGET = {
  all: 'all',
  category: 'category',
  partner: 'partner'
} as const;
export type BoostTarget = (typeof BOOST_TARGETS)[number];

export const GIFT_CARD_TYPES = ['bon_achat', 'carte_cadeau', 'box_up'] as const;
export type GiftCardType = (typeof GIFT_CARD_TYPES)[number];

export const GIFT_CARD_STATUSES = ['actif', 'utilise', 'expire'] as const;
export type GiftCardStatus = (typeof GIFT_CARD_STATUSES)[number];

export const NOTIFICATION_CATEGORIES = ['cashback', 'points', 'boosts', 'lotteries', 'system', 'gifts', 'donations'] as const;
export const NOTIFICATION_CATEGORY = {
  cashback: 'cashback',
  points: 'points',
  boosts: 'boosts',
  lotteries: 'lotteries',
  system: 'system',
  gifts: 'gifts',
  donations: 'donations'
} as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const LOTTERY_STATUSES = ['upcoming', 'live', 'closed'] as const;
export const LOTTERY_STATUS = {
  upcoming: 'upcoming',
  live: 'live',
  closed: 'closed'
} as const;
export type LotteryStatus = (typeof LOTTERY_STATUSES)[number];

export const CHALLENGE_STATUSES = ['upcoming', 'active', 'completed'] as const;
export type ChallengeStatus = (typeof CHALLENGE_STATUSES)[number];

export const REFERRAL_STATUSES = ['pending', 'completed', 'expired'] as const;
export type ReferralStatus = (typeof REFERRAL_STATUSES)[number];

export const PAYMENT_METHOD_TYPES = ['card', 'bank_account', 'wallet'] as const;
export type PaymentMethodType = (typeof PAYMENT_METHOD_TYPES)[number];

export const BANK_CONNECTION_STATUSES = ['active', 'syncing', 'error', 'disconnected'] as const;
export type BankConnectionStatus = (typeof BANK_CONNECTION_STATUSES)[number];


