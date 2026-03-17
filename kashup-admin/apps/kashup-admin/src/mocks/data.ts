import type { AdminUser } from '@/types/auth';
import type {
  ContentItem,
  Donation,
  DrimifyExperience,
  GiftCard,
  NotificationTemplate,
  Offer,
  Partner,
  PowensWebhook,
  Transaction,
  User,
  WebhookEvent,
} from '@/types/entities';
import type { DashboardSummary, ImpactStat } from '@/features/dashboard/api';
import type { RewardsResponse } from '@/features/rewards/api';
import type { GiftCardOrder } from '@/features/gift-cards/api';
import type { PowensOverview } from '@/features/powens/api';
import type { MonitoringHealth, MonitoringMetric } from '@/features/webhooks/api';
import type { AdminRoleEntry, AuditLogEntry, GlobalObjectives } from '@/features/settings/api';
import type {
  GiftCardAmount,
  CarteUpLibre,
  CarteUpPredefinie,
  BoxUp,
  GiftSendLog,
} from '@/types/gifts';
import type { Association, Projet } from '@/types/entities';

const iso = (daysAgo = 0) => new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

const adminUser: AdminUser = {
  id: 'admin-1',
  email: 'ops@kashup.com',
  fullName: 'Jeanne Ops',
  role: 'admin',
  lastLoginAt: iso(0),
};

const partners: Partner[] = [
  {
    id: 'partner-1',
    name: 'Bio Market IDF',
    siret: '12345678901234',
    category: 'Retail',
    territory: 'martinique',
    status: 'active',
    logoUrl: '',
    createdAt: iso(60),
    giftCardEnabled: true,
    giftCardCashbackRate: 5,
    giftCardDescription: 'Carte cadeau Bio Market de 20€ à 100€',
    discoveryCashbackRate: 10,
    permanentCashbackRate: 5,
    boostEnabled: true,
    boostRate: 20,
    address: '123 Rue de la Bio, 75001 Paris',
    pointsPerTransaction: 10,
    marketingPrograms: ['pepites'],
    featuredOffers: [
      {
        id: 'offer-featured-1',
        price: 50,
        cashbackRate: 15,
        imageUrl: '',
      },
    ],
    transactionGrowth: 12.5,
    averageBasketGrowth: 8.3,
  },
  {
    id: 'partner-2',
    name: 'Cyclodrive Sud',
    category: 'Mobilité',
    territory: 'guadeloupe',
    status: 'inactive',
    createdAt: iso(45),
    giftCardEnabled: false,
    discoveryCashbackRate: 8,
    permanentCashbackRate: 4,
    boostEnabled: false,
    address: '456 Avenue du Vélo, 13001 Marseille',
    pointsPerTransaction: 15,
    marketingPrograms: [],
    featuredOffers: [],
    transactionGrowth: -5.2,
    averageBasketGrowth: -2.1,
  },
  {
    id: 'partner-3',
    name: 'Ateliers Solidaires',
    category: 'Culture',
    territory: 'guyane',
    status: 'active',
    createdAt: iso(30),
    giftCardEnabled: true,
    giftCardCashbackRate: 8,
    giftCardDescription: 'Carte cadeau Ateliers Solidaires',
    discoveryCashbackRate: 12,
    permanentCashbackRate: 6,
    boostEnabled: true,
    boostRate: 25,
    address: '789 Boulevard Culture, 33000 Bordeaux',
    pointsPerTransaction: 8,
    marketingPrograms: ['pepites', 'boosted', 'most-searched'],
    featuredOffers: [
      {
        id: 'offer-featured-2',
        price: 30,
        cashbackRate: 20,
        imageUrl: '',
      },
    ],
    transactionGrowth: 18.7,
    averageBasketGrowth: 15.4,
  },
];

const users: User[] = [
  {
    id: 'user-1',
    fullName: 'Lina Favre',
    email: 'lina@kashup.app',
    age: 29,
    gender: 'female',
    status: 'active',
    kycLevel: 'advanced',
    territory: 'martinique',
    createdAt: iso(120),
    wallet: {
      id: 'wallet-1',
      balanceCashback: 2450,
      balancePoints: 12000,
      updatedAt: iso(1),
    },
    transactionGrowth: 15.3,
    averageBasketGrowth: 8.7,
  },
  {
    id: 'user-2',
    fullName: 'Nils Gauthier',
    email: 'nils@kashup.app',
    age: 28,
    gender: 'male',
    status: 'kyc_pending',
    kycLevel: 'basic',
    territory: 'guadeloupe',
    createdAt: iso(80),
    wallet: {
      id: 'wallet-2',
      balanceCashback: 540,
      balancePoints: 3200,
      updatedAt: iso(2),
    },
    transactionGrowth: -5.2,
    averageBasketGrowth: -2.1,
  },
  {
    id: 'user-3',
    fullName: 'Maya Lemoine',
    email: 'maya@kashup.app',
    age: 35,
    gender: 'female',
    status: 'active',
    kycLevel: 'advanced',
    territory: 'guyane',
    createdAt: iso(30),
    wallet: {
      id: 'wallet-3',
      balanceCashback: 1270,
      balancePoints: 8900,
      updatedAt: iso(3),
    },
    transactionGrowth: 22.1,
    averageBasketGrowth: 12.5,
  },
];

const transactions: Transaction[] = [
  {
    id: 'tx-1',
    userId: 'user-1',
    partnerId: 'partner-1',
    type: 'cashback',
    status: 'settled',
    amount: 45.2,
    createdAt: iso(0.5),
  },
  {
    id: 'tx-2',
    userId: 'user-1',
    partnerId: 'partner-2',
    type: 'points',
    status: 'pending',
    amount: 1200,
    createdAt: iso(1),
  },
  {
    id: 'tx-3',
    userId: 'user-2',
    partnerId: 'partner-3',
    type: 'boost',
    status: 'flagged',
    amount: 30,
    createdAt: iso(2),
  },
];

const rewards: RewardsResponse = {
  boosts: [
    {
      id: 'reward-1',
      type: 'boost',
      title: 'Boost +20%',
      status: 'active',
      stock: 120,
      duration: 7,
      boostRate: 20,
      imageUrl: 'https://via.placeholder.com/400x300',
      partnerCategoryFilter: 'Restauration',
      userType: 'Utilisateurs actifs',
    },
    {
      id: 'reward-5',
      type: 'boost',
      title: 'Boost week-end spécial',
      status: 'active',
      stock: 80,
      duration: 2,
      boostRate: 15,
      imageUrl: 'https://via.placeholder.com/400x300',
      partnerId: 'partner-1',
      userType: 'Tous',
    },
  ],
  badges: [
    {
      id: 'reward-2',
      type: 'badge',
      title: 'Ambassadeur local',
      status: 'active',
      stock: 0,
      duration: 30,
      boostRate: 5,
      imageUrl: 'https://via.placeholder.com/400x300',
      transactionCount: 10,
      partnerCategory: 'Restauration',
    },
  ],
  lotteries: [
    {
      id: 'reward-3',
      type: 'lottery',
      title: 'Tombola mobilité',
      status: 'active',
      stock: 50,
      participantCount: 230,
      duration: 14,
      boostRate: 10,
      imageUrl: 'https://via.placeholder.com/400x300',
      partnerIds: ['partner-1', 'partner-2'],
      startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Demain
      endAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // Dans 15 jours
      pointsRequired: 100,
      maxTicketsPerUser: 5,
      rules: 'Règlement de la loterie :\n- Chaque ticket coûte 100 points\n- Maximum 5 tickets par utilisateur\n- Tirage au sort le dernier jour\n- Les gagnants seront notifiés par email',
    },
  ],
  challenges: [
    {
      id: 'reward-4',
      type: 'challenge',
      title: 'Défi territoire Ouest',
      status: 'draft',
      stock: 0,
      duration: 30,
      boostRate: 25,
      imageUrl: 'https://via.placeholder.com/400x300',
      challengePartnerCategory: 'Restauration',
      challengePartnerIds: ['partner-1', 'partner-3'],
      challengeStartAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Dans 7 jours
      challengeEndAt: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(), // Dans 37 jours
      challengeTransactionCount: 15,
    },
  ],
};

const giftCards: GiftCard[] = [
  { id: 'gift-1', partner: 'Fnac Darty', value: 30, status: 'available' },
  { id: 'gift-2', partner: 'Decathlon', value: 50, status: 'sold' },
];

const giftCardOrders: GiftCardOrder[] = [
  {
    id: 'gift-2',
    partner: 'Decathlon',
    value: 50,
    status: 'delivered',
    orderId: 'order-1',
    code: 'GIFT-DEC-001',
    createdAt: iso(1),
  },
];

const donations: Donation[] = [
  { id: 'don-1', association: 'Fondation Local Impact', amount: 12000, supporters: 340, status: 'active' },
  { id: 'don-2', association: 'Association Mer Terre', amount: 5400, supporters: 120, status: 'draft' },
];

const associations: Association[] = [
  {
    id: 'asso-1',
    nom: 'Fondation Local Impact',
    type: 'ecologie',
    but: 'Soutenir les initiatives locales pour un impact positif sur l\'environnement et la communauté.',
    tonImpact: 'Votre don permettra de financer des projets de reforestation et de soutenir les commerces locaux.',
    status: 'active',
    createdAt: iso(10),
    updatedAt: iso(10),
  },
  {
    id: 'asso-2',
    nom: 'Association Mer Terre',
    type: 'ecologie',
    but: 'Protéger les océans et les écosystèmes marins par des actions concrètes et des sensibilisations.',
    tonImpact: 'Votre don contribuera au nettoyage des plages et à la protection de la biodiversité marine.',
    status: 'active',
    createdAt: iso(5),
    updatedAt: iso(5),
  },
];

const projets: Projet[] = [
  {
    id: 'proj-1',
    nom: 'Projet de reforestation',
    descriptif: 'Planter 1000 arbres dans les zones déforestées pour restaurer les écosystèmes locaux.',
    tonImpact: 'Chaque don permet de planter 10 arbres et de contribuer à la lutte contre le changement climatique.',
    status: 'active',
    createdAt: iso(7),
    updatedAt: iso(7),
  },
  {
    id: 'proj-2',
    nom: 'Soutien aux commerces locaux',
    descriptif: 'Aider les petits commerces locaux à se développer et à créer des emplois durables.',
    tonImpact: 'Votre don sera utilisé pour offrir des micro-crédits et des formations aux commerçants locaux.',
    status: 'draft',
    createdAt: iso(3),
    updatedAt: iso(3),
  },
];

const contentItems: ContentItem[] = [
  { id: 'content-1', title: 'Spotlight Mobilité douce', type: 'spotlight', status: 'live', updatedAt: iso(2), locale: 'fr' },
  { id: 'content-2', title: 'BoxUp Printemps', type: 'boxup', status: 'draft', updatedAt: iso(4), locale: 'fr' },
];

const notificationTemplates: NotificationTemplate[] = [
  { id: 'tpl-1', name: 'Relance KYC', channel: 'email', audience: 'kyc_pending', updatedAt: iso(1) },
  { id: 'tpl-2', name: 'Boost week-end', channel: 'push', audience: 'active', updatedAt: iso(0.5) },
];

const powensOverview: PowensOverview = {
  linkToken: 'powens-token-demo',
  links: [
    {
      id: 'powens-link-1',
      bank: 'Crédit Mutuel',
      status: 'active',
      accounts: 124,
      budgetTracked: 250000,
      paymentsActive: 540,
      updatedAt: iso(0.2),
    },
    {
      id: 'powens-link-2',
      bank: 'BNP Paribas',
      status: 'syncing',
      accounts: 80,
      budgetTracked: 125000,
      paymentsActive: 210,
      updatedAt: iso(0.5),
    },
  ],
  alerts: [
    { type: 'budget', message: 'Budget IDF proche du quota', severity: 'warning' },
    { type: 'payment', message: '3 paiements en attente', severity: 'info' },
  ],
};

const powensWebhooks: PowensWebhook[] = [
  { id: 'pw-1', event: 'accounts.sync', status: 'success', receivedAt: iso(0.1) },
  { id: 'pw-2', event: 'payment.failed', status: 'warning', receivedAt: iso(0.3) },
];

const drimifyExperiences: DrimifyExperience[] = [
  {
    id: 'drim-1',
    title: 'Quiz impact local',
    status: 'live',
    startAt: iso(3),
    endAt: iso(-3),
    participants: 480,
  },
  {
    id: 'drim-2',
    title: 'Roulette solidaire',
    status: 'draft',
    startAt: iso(5),
    endAt: iso(-1),
    participants: 0,
  },
];

const webhookEvents: WebhookEvent[] = [
  { id: 'wh-1', source: 'powens', status: 'success', payloadPreview: 'accounts.sync #4587', receivedAt: iso(0.05) },
  { id: 'wh-2', source: 'drimify', status: 'warning', payloadPreview: 'experience.end #drim-1', receivedAt: iso(0.2) },
  { id: 'wh-3', source: 'rewards', status: 'error', payloadPreview: 'boost.purchase #reward-1', receivedAt: iso(0.4) },
];

const monitoringHealth: MonitoringHealth = {
  status: 'up',
  lastHeartbeat: iso(0.02),
  metrics: [
    { name: 'Powens latency', value: 320, threshold: 500, unit: 'ms' },
    { name: 'Drimify queue', value: 60, threshold: 80, unit: 'jobs' },
  ],
};

const monitoringMetrics: MonitoringMetric[] = [
  {
    name: 'Webhook backlog',
    value: 42,
    threshold: 80,
    unit: 'jobs',
    history: Array.from({ length: 12 }).map((_, index) => ({
      timestamp: `${index}`,
      value: 20 + index * 2,
    })),
  },
  {
    name: 'Prometheus alert rate',
    value: 6,
    threshold: 10,
    unit: 'alerts/h',
    history: Array.from({ length: 12 }).map((_, index) => ({
      timestamp: `${index}`,
      value: 4 + index * 0.3,
    })),
  },
];

const dashboardSummary: DashboardSummary = {
  kpis: {
    cashbackVolume: 182000,
    pointsInjected: 480000,
    activeUsers: 18450,
    activePartners: 320,
  },
  dailyTransactions: Array.from({ length: 14 }).map((_, index) => ({
    date: new Date(Date.now() - (13 - index) * 24 * 3600 * 1000).toLocaleDateString('fr-FR'),
    transactions: 500 + index * 12,
    cashbackVolume: 8000 + index * 150,
    pointsVolume: 6000 + index * 120,
  })),
  territories: [
    { territory: 'idf', transactions: 820, cashbackVolume: 32000 },
    { territory: 'south', transactions: 540, cashbackVolume: 21000 },
    { territory: 'west', transactions: 460, cashbackVolume: 18000 },
    { territory: 'national', transactions: 1100, cashbackVolume: 45000 },
  ],
  recentWebhooks: webhookEvents,
  services: [
    { name: 'Powens', status: 'up', latencyMs: 320, incidents24h: 0, lastCheckedAt: iso(0.05) },
    { name: 'Drimify', status: 'warning', latencyMs: 840, incidents24h: 2, lastCheckedAt: iso(0.07) },
    { name: 'Notifications', status: 'up', latencyMs: 210, incidents24h: 0, lastCheckedAt: iso(0.05) },
    { name: 'Webhooks', status: 'up', latencyMs: 180, incidents24h: 1, lastCheckedAt: iso(0.05) },
    { name: 'Prometheus', status: 'up', latencyMs: 90, incidents24h: 0, lastCheckedAt: iso(0.05) },
  ],
};

const impactStats: ImpactStat[] = [
  { territory: 'idf', co2SavedKg: 4200, donationsEur: 12000, localShopsSupported: 68 },
  { territory: 'south', co2SavedKg: 2100, donationsEur: 5400, localShopsSupported: 32 },
  { territory: 'west', co2SavedKg: 1800, donationsEur: 4600, localShopsSupported: 21 },
];

const offers: Offer[] = [
  {
    id: 'offer-1',
    partnerId: 'partner-1',
    partnerName: 'Restaurant Le Jardin',
    partnerLogoUrl: 'https://via.placeholder.com/100',
    title: 'Menu déjeuner à 25€',
    price: 25,
    cashbackRate: 10,
    startAt: iso(2),
    endAt: iso(-5),
    stock: 50,
    stockUsed: 12,
    imageUrl: 'https://via.placeholder.com/400x300',
    status: 'active',
  },
  {
    id: 'offer-2',
    partnerId: 'partner-2',
    partnerName: 'Spa Relaxation',
    partnerLogoUrl: 'https://via.placeholder.com/100',
    title: 'Soin visage -30%',
    price: 45,
    cashbackRate: 15,
    startAt: iso(1),
    endAt: iso(-10),
    stock: 30,
    stockUsed: 8,
    imageUrl: 'https://via.placeholder.com/400x300',
    status: 'active',
  },
  {
    id: 'offer-3',
    partnerId: 'partner-1',
    partnerName: 'Restaurant Le Jardin',
    partnerLogoUrl: 'https://via.placeholder.com/100',
    title: 'Menu du soir spécial',
    price: 35,
    cashbackRate: 12,
    startAt: iso(-2),
    endAt: iso(-15),
    stock: 40,
    stockUsed: 40,
    imageUrl: 'https://via.placeholder.com/400x300',
    status: 'expired',
  },
  {
    id: 'offer-4',
    partnerId: 'partner-3',
    partnerName: 'Cinéma Paradis',
    partnerLogoUrl: 'https://via.placeholder.com/100',
    title: 'Place de cinéma -20%',
    price: 8,
    cashbackRate: 5,
    startAt: iso(5),
    endAt: iso(10),
    stock: 100,
    stockUsed: 0,
    imageUrl: 'https://via.placeholder.com/400x300',
    status: 'scheduled',
  },
  {
    id: 'offer-5',
    partnerId: 'partner-1',
    title: 'Cashback Bio Market 10%',
    startAt: iso(1),
    endAt: iso(-10),
    stock: 50,
    stockUsed: 5,
    cashbackRate: 10,
    status: 'active',
  },
];

const roles: AdminRoleEntry[] = [
  { id: 'role-1', email: 'ops@kashup.com', fullName: 'Jeanne Ops', role: 'admin', lastLoginAt: iso(0.1) },
  { id: 'role-2', email: 'support@kashup.com', fullName: 'Paul Support', role: 'support', lastLoginAt: iso(2) },
  { id: 'role-3', email: 'partners@kashup.com', fullName: 'Nora Partners', role: 'partner_manager', lastLoginAt: iso(1) },
];

const globalObjectives: GlobalObjectives = {
  monthlyCashbackTarget: 200000,
  pointsQuota: 500000,
  donationsTarget: 30000,
  powensQuota: 10000,
};

const auditLogs: AuditLogEntry[] = [
  { id: 'log-1', actor: 'Jeanne Ops', action: 'Ajustement quota points', createdAt: iso(0.5), metadata: 'pointsQuota -> 500k' },
  { id: 'log-2', actor: 'Paul Support', action: 'Reset mot de passe user-1', createdAt: iso(1), metadata: 'userId=user-1' },
];

// ============================================================================
// DONNÉES MOCKÉES - CARTES UP & BOX UP
// ============================================================================

const giftCardAmounts: GiftCardAmount[] = [
  { id: 'amount-1', amount: 5, createdAt: iso(30), updatedAt: iso(30) },
  { id: 'amount-2', amount: 10, createdAt: iso(30), updatedAt: iso(30) },
  { id: 'amount-3', amount: 20, createdAt: iso(30), updatedAt: iso(30) },
  { id: 'amount-4', amount: 50, createdAt: iso(30), updatedAt: iso(30) },
  { id: 'amount-5', amount: 100, createdAt: iso(30), updatedAt: iso(30) },
];

const cartesUpLibres: CarteUpLibre[] = [
  {
    id: 'carte-libre-1',
    nom: 'Carte Up Liberté',
    description: 'Choisissez votre montant et votre partenaire préféré',
    imageUrl: 'https://via.placeholder.com/400x300',
    montantsDisponibles: [10, 20, 50, 100],
    partenairesEligibles: ['partner-1', 'partner-2', 'partner-3'],
    conditions: 'Valable 1 an après achat',
    commentCaMarche: 'Sélectionnez un montant et un partenaire, puis offrez la carte à un proche',
    status: 'active',
    createdAt: iso(10),
    updatedAt: iso(10),
  },
];

const cartesUpPredefinies: CarteUpPredefinie[] = [
  {
    id: 'carte-prede-1',
    nom: 'Massage Relaxant + SPA',
    partenaireId: 'partner-2',
    partenaireName: 'Spa Relaxation',
    offre: 'Massage 1h + accès SPA',
    montant: 80,
    imageUrl: 'https://via.placeholder.com/400x300',
    description: 'Offre complète bien-être avec massage et accès spa',
    conditions: 'Valable 6 mois, réservation obligatoire',
    commentCaMarche: 'Offrez cette carte et le bénéficiaire pourra réserver directement',
    status: 'active',
    createdAt: iso(5),
    updatedAt: iso(5),
  },
];

const boxUps: BoxUp[] = [
  {
    id: 'box-1',
    nom: 'Box Découverte Martinique',
    description: 'Une sélection d\'expériences locales pour découvrir la Martinique',
    imageUrl: 'https://via.placeholder.com/400x300',
    partenaires: [
      {
        partenaireId: 'partner-1',
        partenaireName: 'Bio Market IDF',
        offrePartenaire: 'Panier bio de 30€',
        conditions: 'Valable en magasin uniquement',
      },
      {
        partenaireId: 'partner-3',
        partenaireName: 'Ateliers Solidaires',
        offrePartenaire: 'Atelier découverte de 2h',
        conditions: 'Réservation obligatoire',
      },
    ],
    commentCaMarche: 'Offrez cette box et le bénéficiaire pourra utiliser chaque offre chez les partenaires',
    status: 'active',
    createdAt: iso(3),
    updatedAt: iso(3),
  },
];

const giftSendLogs: GiftSendLog[] = [
  {
    id: 'log-gift-1',
    cadeauId: 'carte-libre-1',
    cadeauNom: 'Carte Up Liberté',
    type: 'carte-up-libre',
    expediteurEmail: 'user@example.com',
    destinataireEmail: 'destinataire@example.com',
    statut: 'envoye',
    dateEnvoi: iso(0.5),
    createdAt: iso(0.5),
  },
  {
    id: 'log-gift-2',
    cadeauId: 'box-1',
    cadeauNom: 'Box Découverte Martinique',
    type: 'box-up',
    expediteurId: 'user-1',
    destinataireUserId: 'user-2',
    statut: 'envoye',
    dateEnvoi: iso(1),
    createdAt: iso(1),
  },
];

// Base de données par défaut
const defaultDb = {
  adminUser,
  tokens: { access: 'token-123', refresh: 'refresh-123' },
  partners,
  // Générer les catégories à partir de categories (tableau) ou category (chaîne pour compatibilité)
  partnerCategories: Array.from(
    new Set(
      partners.flatMap((p) => {
        // Si categories existe (tableau), l'utiliser
        if (p.categories && Array.isArray(p.categories) && p.categories.length > 0) {
          return p.categories;
        }
        // Sinon, utiliser category (pour compatibilité)
        return p.category ? [p.category] : [];
      })
    )
  ),
  users,
  transactions,
  rewards,
  giftCards,
  giftCardOrders,
  donations,
  contentItems,
  notificationTemplates,
  powensOverview,
  powensWebhooks,
  drimifyExperiences,
  webhookEvents,
  monitoringHealth,
  monitoringMetrics,
  dashboardSummary,
  impactStats,
  offers,
  roles,
  globalObjectives,
  auditLogs,
  giftCardAmounts,
  cartesUpLibres,
  cartesUpPredefinies,
  boxUps,
  giftSendLogs,
  associations,
  projets,
  partnerDocuments: [] as PartnerDocument[],
  partnerAliases: [] as Array<{ id: string; partnerId: string; aliasText: string; priority: number; createdAt: string; updatedAt: string }>,
};

// Charger les données depuis localStorage si disponible
import { loadAllFromStorage, saveAllToStorage } from './persistence';

let db = loadAllFromStorage(defaultDb);

// Fonction pour sauvegarder automatiquement
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const scheduleSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    try {
      saveAllToStorage(db);
      if (import.meta.env.DEV) {
        console.log('[Persistence] Données sauvegardées');
      }
    } catch (error) {
      console.error('[Persistence] Erreur lors de la sauvegarde:', error);
    }
  }, 300);
};

// Fonction pour créer un proxy pour un tableau
const createArrayProxy = <T extends unknown[]>(arr: T): T => {
  const arrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
  const handler: ProxyHandler<T> = {
    get(target, prop) {
      const value = Reflect.get(target, prop);
      if (typeof prop === 'string' && arrayMethods.includes(prop) && typeof value === 'function') {
        // Wrapper la méthode pour sauvegarder après modification
        return function (this: T, ...args: unknown[]) {
          const result = value.apply(target, args);
          scheduleSave();
          return result;
        };
      }
      return value;
    },
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value);
      if (result) {
        scheduleSave();
      }
      return result;
    },
  };
  return new Proxy(arr, handler);
};

// Cache pour les tableaux proxifiés
const arrayProxyCache = new WeakMap<unknown[], unknown[]>();

// Proxifier tous les tableaux au chargement
const proxifyArrays = (obj: Record<string, unknown>): void => {
  for (const key in obj) {
    if (Array.isArray(obj[key])) {
      const arr = obj[key] as unknown[];
      // Utiliser le cache pour éviter de créer plusieurs proxies pour le même tableau
      if (!arrayProxyCache.has(arr)) {
        arrayProxyCache.set(arr, createArrayProxy(arr));
      }
      obj[key] = arrayProxyCache.get(arr);
    } else if (obj[key] && typeof obj[key] === 'object' && obj[key] !== null && !(obj[key] instanceof Date)) {
      proxifyArrays(obj[key] as Record<string, unknown>);
    }
  }
};

// Proxifier tous les tableaux dans db
proxifyArrays(db);

// Créer un proxy pour intercepter les modifications au niveau de db
db = new Proxy(db, {
  set(target, prop, value) {
    // Si on assigne un tableau, le proxifier
    if (Array.isArray(value)) {
      if (!arrayProxyCache.has(value)) {
        arrayProxyCache.set(value, createArrayProxy(value));
      }
      value = arrayProxyCache.get(value) as typeof value;
    }
    const result = Reflect.set(target, prop, value);
    if (result) {
      scheduleSave();
    }
    return result;
  },
  get(target, prop) {
    const value = Reflect.get(target, prop);
    // Si c'est un tableau, retourner le proxy depuis le cache
    if (Array.isArray(value)) {
      if (!arrayProxyCache.has(value)) {
        arrayProxyCache.set(value, createArrayProxy(value));
      }
      return arrayProxyCache.get(value);
    }
    return value;
  },
}) as typeof defaultDb;

export { db };


