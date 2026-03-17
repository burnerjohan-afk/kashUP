export type Territory = 'martinique' | 'guadeloupe' | 'guyane';

export type UserStatus = 'active' | 'kyc_pending' | 'kyc_blocked' | 'suspended';

export type Wallet = {
  id: string;
  balanceCashback: number;
  balancePoints: number;
  updatedAt: string;
};

export type User = {
  id: string;
  fullName: string;
  email: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  status: UserStatus;
  kycLevel: 'none' | 'basic' | 'advanced';
  territory: Territory;
  createdAt: string;
  wallet: Wallet;
  // Statistiques de croissance
  transactionGrowth?: number; // Pourcentage de croissance des transactions
  averageBasketGrowth?: number; // Pourcentage de croissance du panier moyen
};

export type Partner = {
  id: string;
  name: string;
  siret?: string;
  phone?: string;
  kbisUrl?: string;
  logoUrl?: string;
  createdAt: string;
  status: 'active' | 'inactive' | 'pending';
  category: string; // Pour compatibilité avec l'ancien système
  categories?: string[]; // Nouveau : plusieurs catégories possibles
  territory: Territory; // Pour compatibilité avec l'ancien système
  territories?: Territory[]; // Nouveau : plusieurs territoires possibles
  // Cashback (noms API)
  discoveryCashbackRate?: number;
  permanentCashbackRate?: number;
  discoveryCashbackKashupShare?: number;
  discoveryCashbackUserShare?: number;
  permanentCashbackKashupShare?: number;
  permanentCashbackUserShare?: number;
  // Remboursements (alias formulaire)
  welcomeAffiliationAmount?: number; // Montant affiliation négocié offre bienvenue
  permanentAffiliationAmount?: number; // Montant affiliation négocié offre permanente
  welcomeUserRate?: number; // Taux users offre bienvenue (= discoveryCashbackUserShare)
  welcomeKashUPRate?: number; // Taux kashUP offre bienvenue (= discoveryCashbackKashupShare)
  permanentUserRate?: number; // Taux users offre permanente (= permanentCashbackUserShare)
  permanentKashUPRate?: number; // Taux kashUP offre permanente (= permanentCashbackKashupShare)
  // Gift cards
  giftCardEnabled: boolean;
  giftCardCashbackRate?: number; // Taux de cashback pour les bons d'achats
  giftCardDescription?: string;
  giftCardImageUrl?: string;
  giftCardVirtualCardImageUrl?: string;
  // Boosts
  boostEnabled: boolean;
  boostRate?: number;
  // Localisation
  address?: string;
  // Points
  pointsPerTransaction?: number;
  // Marketing
  marketingPrograms?: Array<'pepites' | 'boosted' | 'most-searched'>;
  // Statistiques de croissance
  transactionGrowth?: number; // Pourcentage de croissance des transactions (positif = augmentation, négatif = diminution)
  averageBasketGrowth?: number; // Pourcentage de croissance du panier moyen (positif = augmentation, négatif = diminution)
  // Informations supplémentaires (API peut retourner une string "9h - 18h" ou un objet)
  openingHours?: {
    start: string;
    end: string;
  } | string;
  openingDays?: Array<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'>;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  menuImages?: string[]; // URLs des images du menu (uniquement pour restaurants)
  photos?: string[]; // URLs des photos (pour tous les secteurs, y compris restaurants)
  /** Offres à la une (mocks / back office) */
  featuredOffers?: Array<{ id: string; price?: number; cashbackRate?: number; imageUrl?: string }>;
};

export type PartnerDocument = {
  id: string;
  partnerId: string;
  name: string;
  type: 'invoice' | 'commercial_analysis' | 'contract' | 'other';
  url: string;
  size?: string;
  createdAt: string;
};

export type Offer = {
  id: string;
  partnerId: string;
  partnerName?: string; // Pour l'affichage
  partnerLogoUrl?: string; // Logo du partenaire
  title: string;
  price?: number; // Prix de l'offre
  cashbackRate: number; // Taux de cashback
  startAt: string; // Date de début
  endAt: string; // Date de fin
  stock: number; // Nombre d'offres disponibles
  stockUsed: number; // Nombre d'offres déjà utilisées (compteur qui descend)
  imageUrl?: string; // Image de l'offre
  status: 'scheduled' | 'active' | 'expired';
  conditions?: string; // Conditions de l'offre
};

export type Reward = {
  id: string;
  type: 'boost' | 'badge' | 'lottery' | 'challenge';
  title: string;
  status: 'draft' | 'active' | 'archived';
  stock: number;
  awardedAt?: string;
  participantCount?: number;
  // Nouveaux champs communs
  duration?: number; // Durée en jours
  boostRate?: number; // Taux de boost en pourcentage
  imageUrl?: string; // Image de la récompense
  // Champs spécifiques aux badges
  transactionCount?: number; // Nombre de transactions requis (pour badges)
  partnerCategory?: string; // Type de partenaire (pour badges)
  // Champs spécifiques aux boosts
  partnerId?: string; // Partenaire spécifique (pour boosts)
  partnerCategoryFilter?: string; // Typologie de partenaires (pour boosts)
  userType?: string; // Typologie d'utilisateurs (pour boosts)
  // Champs spécifiques aux loteries
  partnerIds?: string[]; // Un ou plusieurs partenaires (pour loteries)
  startAt?: string; // Date de début (pour loteries)
  endAt?: string; // Date de fin (pour loteries)
  drawDate?: string; // Date du tirage
  pointsRequired?: number; // Nombre de points pour accéder (pour loteries)
  maxTicketsPerUser?: number | null; // Nombre max de tickets par utilisateur (null = illimité)
  totalTicketsAvailable?: number | null; // Nombre total de tickets (si stock limité)
  isTicketStockLimited?: boolean;
  showOnHome?: boolean;
  showOnRewards?: boolean;
  prizeType?: string;
  prizeTitle?: string; // Titre du lot
  prizeDescription?: string; // Description du lot
  prizeValue?: number;
  prizeCurrency?: string;
  shortDescription?: string;
  rules?: string; // Règlement de la loterie
  // Champs spécifiques aux défis
  category?: string; // Catégorie menu Badges & points : consentements | parrainages | cagnotte | achats | connexion | ma_fid
  challengePartnerCategory?: string; // Typologie de partenaires (pour défis)
  challengePartnerIds?: string[]; // Un ou plusieurs partenaires (pour défis)
  challengeStartAt?: string; // Date de début (pour défis)
  challengeEndAt?: string; // Date de fin (pour défis)
  challengeTransactionCount?: number; // Nombre de transactions requis (pour défis)
  rewardPoints?: number; // Points gagnés à la réussite du défi (pour défis)
  // Champ commun pour les conditions
  conditions?: string; // Conditions générales (pour tous les types de récompenses)
};

export type GiftCard = {
  id: string;
  partner: string;
  value: number;
  status: 'available' | 'sold' | 'delivered';
  conditions?: string; // Conditions du bon d'achat
};

export type Donation = {
  id: string;
  association: string;
  amount: number;
  supporters: number;
  status: 'draft' | 'active';
};

export type AssociationType = 'solidaire' | 'humanitaire' | 'ecologie' | 'sante' | 'education' | 'culture' | 'sport' | 'autre';

export type Association = {
  id: string;
  nom: string;
  type: AssociationType; // Type d'association
  but: string; // But de l'association
  tonImpact: string; // À quoi servira le don
  imageUrl?: string; // URL de l'image de l'association
  status: 'draft' | 'active';
  createdAt: string;
  updatedAt: string;
};

export type Projet = {
  id: string;
  nom: string;
  descriptif: string;
  tonImpact: string; // À quoi servira le don
  status: 'draft' | 'active';
  createdAt: string;
  updatedAt: string;
};

export type ContentItem = {
  id: string;
  title: string;
  type: 'spotlight' | 'boxup' | 'category';
  status: 'draft' | 'live';
  updatedAt: string;
  locale: 'fr' | 'en';
};

export type NotificationTemplate = {
  id: string;
  name: string;
  channel: 'push' | 'email' | 'sms';
  audience: string;
  updatedAt: string;
};

export type Transaction = {
  id: string;
  userId: string;
  partnerId?: string;
  type: 'cashback' | 'points' | 'boost';
  status: 'pending' | 'settled' | 'flagged';
  amount: number;
  createdAt: string;
};

export type WebhookEvent = {
  id: string;
  source: string;
  status: 'success' | 'warning' | 'error';
  payloadPreview: string;
  receivedAt: string;
};

export type PowensLink = {
  id: string;
  bank: string;
  status: 'active' | 'syncing' | 'error';
  accounts: number;
  budgetTracked: number;
  paymentsActive: number;
  updatedAt: string;
};

export type PowensWebhook = {
  id: string;
  event: string;
  status: 'success' | 'warning' | 'error';
  receivedAt: string;
};

export type DrimifyExperience = {
  id: string;
  title: string;
  status: 'draft' | 'live' | 'ended';
  startAt: string;
  endAt: string;
  participants: number;
};

