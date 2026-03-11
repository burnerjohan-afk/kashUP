import { http, HttpResponse } from 'msw';
import { db } from './data';
import type { TransactionsFilters } from '@/features/transactions/api';
import type { UsersFilters } from '@/features/users/api';
import type { ContentItem, Offer, Partner, PowensWebhook, Reward, Territory } from '@/types/entities';
import type { GiftCardOrder, GiftCardPurchaseInput } from '@/features/gift-cards/api';
import type { DonationFormInput, ContentFormInput } from '@/features/donations/api';
import type { NotificationFormInput } from '@/features/notifications/api';
import type { ManualTransactionInput } from '@/features/transactions/api';
import type { PartnerFormInput } from '@/features/partners/api';
import type { OfferFormInput } from '@/features/offers/api';
import type { RewardFormInput } from '@/features/rewards/api';
import type { RoleFormInput } from '@/features/settings/api';
import type { WebhookTestInput } from '@/features/webhooks/api';
import type {
  GiftCardAmount,
  CarteUpLibre,
  CarteUpPredefinie,
  BoxUp,
  GiftSendLog,
  GiftSendInput,
} from '@/types/gifts';
import type { Association, Projet, PartnerDocument } from '@/types/entities';
import type { AssociationFormInput, ProjetFormInput } from '@/features/donations/api';

// Utiliser l'URL de l'API depuis l'environnement ou localhost par défaut
const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Format StandardResponse pour kashup-api
const ok = <T>(data: T, message = 'Opération réussie', meta?: any) => 
  HttpResponse.json({ 
    statusCode: 200, 
    success: true, 
    message, 
    data, 
    meta 
  });
  
const failure = (message: string, statusCode = 400, code?: string, fieldErrors?: Record<string, string[]>) =>
  HttpResponse.json({ 
    statusCode, 
    success: false, 
    message, 
    data: null, 
    meta: { 
      details: { 
        code, 
        fieldErrors 
      } 
    } 
  }, { status: statusCode });

const pickNumber = (value: string | null, fallback: number) =>
  value ? Number(value) || fallback : fallback;

const makeId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mock-${Math.random().toString(36).slice(2, 9)}`;

// Fonction utilitaire pour convertir un File en data URL (base64)
const convertFileToDataUrl = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    const mimeType = file.type || 'application/octet-stream';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error('[MSW] Erreur lors de la conversion du fichier en data URL:', error);
    // En cas d'erreur, retourner une URL placeholder
    return `https://via.placeholder.com/400x300?text=${encodeURIComponent(file.name || 'Fichier')}`;
  }
};

const matchFilters = (filters: UsersFilters, userTerritory: string, userStatus: string, name: string, email: string) => {
  if (filters.territory && filters.territory !== 'all' && filters.territory !== userTerritory) {
    return false;
  }
  if (filters.status && filters.status !== 'all' && filters.status !== userStatus) {
    return false;
  }
  if (filters.search) {
    const term = filters.search.toLowerCase();
    if (!name.toLowerCase().includes(term) && !email.toLowerCase().includes(term)) {
      return false;
    }
  }
  return true;
};

const filterTransactions = (filters: TransactionsFilters) => {
  return db.transactions.filter((transaction) => {
    if (filters.source && filters.source !== 'all' && transaction.type !== filters.source) {
      return false;
    }
    if (filters.status && filters.status !== 'all' && transaction.status !== filters.status) {
      return false;
    }
    if (filters.partnerId && transaction.partnerId !== filters.partnerId) {
      return false;
    }
    return true;
  });
};

export const handlers = [
  // Intercepter les requêtes vers example.com/offers pour éviter les erreurs 404
  http.get('https://example.com/offers/*', () => {
    // Retourner une image SVG mockée pour éviter les erreurs de chargement
    const svgImage = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="Arial" font-size="16">Offre</text></svg>`;
    return HttpResponse.text(svgImage, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }),
  // Intercepter les requêtes vers via.placeholder.com pour éviter les erreurs réseau
  http.get('https://via.placeholder.com/*', () => {
    // Retourner une image SVG mockée pour éviter les erreurs de chargement
    const svgImage = `<svg width="400" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="300" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999" font-family="Arial" font-size="16">Image placeholder</text></svg>`;
    return HttpResponse.text(svgImage, {
      headers: { 'Content-Type': 'image/svg+xml' },
    });
  }),
  // Intercepter les requêtes blob: pour éviter les erreurs ERR_FILE_NOT_FOUND
  // Note: MSW ne peut pas intercepter les blob URLs directement, mais on peut ignorer ces erreurs
  // Les blob URLs sont créées par le navigateur et ne peuvent pas être interceptées par MSW
  
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email?: string; password?: string };
    if (body.email !== db.adminUser.email) {
      return failure('Identifiants invalides', 401, 'AUTH_ERROR');
    }
    return ok({
      tokens: {
      accessToken: db.tokens.access,
      refreshToken: db.tokens.refresh,
      },
      user: db.adminUser,
    }, 'Connexion réussie');
  }),
  http.post(`${API_URL}/auth/password/forgot`, async () => ok(null, 'Email de réinitialisation envoyé')),
  http.post(`${API_URL}/auth/refresh`, async () =>
    ok({
      tokens: {
      accessToken: db.tokens.access,
      refreshToken: db.tokens.refresh,
      },
      user: db.adminUser,
    }, 'Token rafraîchi avec succès'),
  ),
  http.get(`${API_URL}/admin/dashboard`, async ({ request }) => {
    const url = new URL(request.url);
    const territory = url.searchParams.get('territory');
    // Filtrer les données si un territoire est sélectionné
    if (territory && territory !== 'all') {
      const filtered = {
        ...db.dashboardSummary,
        territories: db.dashboardSummary.territories.filter((t) => t.territory === territory),
      };
      return ok(filtered, 'Données du dashboard récupérées avec succès');
    }
    return ok(db.dashboardSummary, 'Données du dashboard récupérées avec succès');
  }),
  http.get(`${API_URL}/stats/impact-local`, async ({ request }) => {
    const url = new URL(request.url);
    const territory = url.searchParams.get('territory');
    // Filtrer les données si un territoire est sélectionné
    if (territory && territory !== 'all') {
      return ok(db.impactStats.filter((stat) => stat.territory === territory), 'Statistiques d\'impact local récupérées avec succès');
    }
    return ok(db.impactStats, 'Statistiques d\'impact local récupérées avec succès');
  }),
  http.get(`${API_URL}/admin/statistics/table`, async ({ request }) => {
    const url = new URL(request.url);
    const territory = url.searchParams.get('territory');
    const sector = url.searchParams.get('sector');
    const month = url.searchParams.get('month');
    const day = url.searchParams.get('day');
    const timeSlot = url.searchParams.get('timeSlot');
    const gender = url.searchParams.get('gender');
    const ageRange = url.searchParams.get('ageRange');

    // Générer des données mockées basées sur les filtres
    const generatePeriod = () => {
      if (month && month !== 'all') {
        const monthNames = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        return monthNames[parseInt(month) - 1];
      }
      if (day && day !== 'all') {
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        return dayNames[parseInt(day)];
      }
      if (timeSlot && timeSlot !== 'all') {
        return timeSlot;
      }
      return 'Période actuelle';
    };

    const baseTransactions = 150;
    const baseBasket = 45;
    const transactionGrowth = (Math.random() * 30 - 10); // Entre -10% et +20%
    const basketGrowth = (Math.random() * 20 - 5); // Entre -5% et +15%

    const data = [
      {
        period: generatePeriod(),
        transactions: Math.floor(baseTransactions * (1 + transactionGrowth / 100)),
        transactionGrowth,
        averageBasket: Math.round((baseBasket * (1 + basketGrowth / 100)) * 10) / 10,
        averageBasketGrowth: basketGrowth,
        totalAmount: Math.round(baseTransactions * baseBasket * (1 + transactionGrowth / 100) * (1 + basketGrowth / 100)),
      },
    ];

    // Si plusieurs filtres sont actifs, générer plusieurs lignes
    if ((territory && territory !== 'all') || (sector && sector !== 'all')) {
      const territories = territory && territory !== 'all' ? [territory] : ['martinique', 'guadeloupe', 'guyane'];
      const sectors = sector && sector !== 'all' ? [sector] : ['Restauration', 'Retail', 'Culture', 'Mobilité'];
      
      const expandedData = [];
      territories.forEach((t) => {
        sectors.forEach((s) => {
          const txGrowth = (Math.random() * 30 - 10);
          const basketGrowth = (Math.random() * 20 - 5);
          expandedData.push({
            period: `${t} - ${s}`,
            transactions: Math.floor(baseTransactions * (1 + txGrowth / 100)),
            transactionGrowth: txGrowth,
            averageBasket: Math.round((baseBasket * (1 + basketGrowth / 100)) * 10) / 10,
            averageBasketGrowth: basketGrowth,
            totalAmount: Math.round(baseTransactions * baseBasket * (1 + txGrowth / 100) * (1 + basketGrowth / 100)),
          });
        });
      });
      // Retourner au format StandardResponse avec structure { rows, totals, filters }
      return ok({
        rows: expandedData,
        totals: {
          count: expandedData.reduce((sum, item) => sum + item.transactions, 0),
          transactions: expandedData.reduce((sum, item) => sum + item.transactions, 0),
          revenue: expandedData.reduce((sum, item) => sum + item.totalAmount, 0),
          cashback: expandedData.reduce((sum, item) => sum + item.totalAmount * 0.05, 0), // 5% de cashback estimé
          averageTransaction: expandedData.length > 0 
            ? expandedData.reduce((sum, item) => sum + item.averageBasket, 0) / expandedData.length 
            : 0,
        },
        filters: {
          territory: territory && territory !== 'all' ? territory : null,
          allDay: true,
          timeSlot: timeSlot && timeSlot !== 'all' ? timeSlot : null,
          gender: gender && gender !== 'all' ? gender : null,
          ageRange: ageRange && ageRange !== 'all' ? ageRange : null,
        },
      }, 'Statistiques de table récupérées avec succès');
    }

    // Retourner au format StandardResponse avec structure { rows, totals, filters }
    return ok({
      rows: data,
      totals: {
        count: data.reduce((sum, item) => sum + item.transactions, 0),
        transactions: data.reduce((sum, item) => sum + item.transactions, 0),
        revenue: data.reduce((sum, item) => sum + item.totalAmount, 0),
        cashback: data.reduce((sum, item) => sum + item.totalAmount * 0.05, 0), // 5% de cashback estimé
        averageTransaction: data.length > 0 
          ? data.reduce((sum, item) => sum + item.averageBasket, 0) / data.length 
          : 0,
      },
      filters: {
        territory: territory && territory !== 'all' ? territory : null,
        allDay: true,
        timeSlot: timeSlot && timeSlot !== 'all' ? timeSlot : null,
        gender: gender && gender !== 'all' ? gender : null,
        ageRange: ageRange && ageRange !== 'all' ? ageRange : null,
      },
    }, 'Statistiques de table récupérées avec succès');
  }),
  http.get(`${API_URL}/admin/statistics/departments`, async () => {
    const departments = [
      {
        territory: 'martinique',
        transactions: 1247,
        transactionGrowth: 12.5,
        averageBasket: 45.8,
        averageBasketGrowth: 8.3,
        totalAmount: 57126,
      },
      {
        territory: 'guadeloupe',
        transactions: 892,
        transactionGrowth: -5.2,
        averageBasket: 42.1,
        averageBasketGrowth: -2.1,
        totalAmount: 37532,
      },
      {
        territory: 'guyane',
        transactions: 654,
        transactionGrowth: 18.7,
        averageBasket: 48.5,
        averageBasketGrowth: 15.4,
        totalAmount: 31719,
      },
    ];
    return ok(departments, 'Statistiques par département récupérées avec succès');
  }),
  http.get(`${API_URL}/admin/statistics/detail`, async ({ request }) => {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') || 'Période actuelle';

    // Générer des données mockées avec évolutions M-1 et N-1
    const currentTransactions = 150;
    const currentBasket = 45;
    const currentAmount = currentTransactions * currentBasket;

    // Données M-1 (mois précédent)
    const m1Transactions = Math.floor(currentTransactions * 0.92); // -8%
    const m1Basket = Math.round(currentBasket * 0.95 * 10) / 10; // -5%
    const m1Amount = m1Transactions * m1Basket;
    const m1TransactionGrowth = ((currentTransactions - m1Transactions) / m1Transactions) * 100;
    const m1BasketGrowth = ((currentBasket - m1Basket) / m1Basket) * 100;
    const m1AmountGrowth = ((currentAmount - m1Amount) / m1Amount) * 100;

    // Données N-1 (année précédente)
    const n1Transactions = Math.floor(currentTransactions * 0.85); // -15%
    const n1Basket = Math.round(currentBasket * 0.88 * 10) / 10; // -12%
    const n1Amount = n1Transactions * n1Basket;
    const n1TransactionGrowth = ((currentTransactions - n1Transactions) / n1Transactions) * 100;
    const n1BasketGrowth = ((currentBasket - n1Basket) / n1Basket) * 100;
    const n1AmountGrowth = ((currentAmount - n1Amount) / n1Amount) * 100;

    // Évolution mensuelle (12 derniers mois)
    const monthlyEvolution = Array.from({ length: 12 }).map((_, index) => {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (11 - index));
      return {
        month: monthDate.toLocaleDateString('fr-FR', { month: 'short' }),
        transactions: Math.floor(currentTransactions * (0.8 + (index / 12) * 0.4)),
        averageBasket: Math.round((currentBasket * (0.85 + (index / 12) * 0.3)) * 10) / 10,
      };
    });

    // Comparaison
    const comparison = [
      {
        period: 'M-1',
        transactions: m1Transactions,
        averageBasket: m1Basket,
        totalAmount: Math.round(m1Amount),
      },
      {
        period: 'N-1',
        transactions: n1Transactions,
        averageBasket: n1Basket,
        totalAmount: Math.round(n1Amount),
      },
      {
        period: 'Actuel',
        transactions: currentTransactions,
        averageBasket: currentBasket,
        totalAmount: Math.round(currentAmount),
      },
    ];

    const detail = {
      current: {
        transactions: currentTransactions,
        averageBasket: currentBasket,
        totalAmount: Math.round(currentAmount),
      },
      evolutionM1: {
        previous: {
          transactions: m1Transactions,
          averageBasket: m1Basket,
          totalAmount: Math.round(m1Amount),
        },
        transactionGrowth: m1TransactionGrowth,
        averageBasketGrowth: m1BasketGrowth,
        totalAmountGrowth: m1AmountGrowth,
      },
      evolutionN1: {
        previous: {
          transactions: n1Transactions,
          averageBasket: n1Basket,
          totalAmount: Math.round(n1Amount),
        },
        transactionGrowth: n1TransactionGrowth,
        averageBasketGrowth: n1BasketGrowth,
        totalAmountGrowth: n1AmountGrowth,
      },
      monthlyEvolution,
      comparison,
    };

    return ok(detail, 'Détails des statistiques récupérés avec succès');
  }),
  http.get(`${API_URL}/admin/ai/analysis`, async ({ request }) => {
    const url = new URL(request.url);
    const territory = url.searchParams.get('territory') || 'all';
    const territoryName = territory === 'all' ? 'tous les départements' : territory;

    // Générer une analyse IA mockée
    const analysis = {
      summary: `Analyse des statistiques pour ${territoryName}:\n\n` +
        `Les données montrent une activité soutenue avec ${territory === 'all' ? '2793' : '1247'} transactions totales. ` +
        `Le panier moyen se situe à ${territory === 'all' ? '44.8€' : '45.8€'}, indiquant une bonne valeur par transaction. ` +
        `Les évolutions sont globalement positives avec une croissance des transactions de ${territory === 'all' ? '8.7%' : '12.5%'} ` +
        `et une amélioration du panier moyen de ${territory === 'all' ? '6.2%' : '8.3%'}.\n\n` +
        `Les secteurs les plus performants sont la Restauration et le Retail, représentant ensemble plus de 45% des transactions. ` +
        `Les pics d'activité se concentrent en fin de semaine (vendredi et samedi) et en soirée (18h-21h).`,

      evolutionAnalysis: `Analyse des évolutions:\n\n` +
        `📈 Croissance des transactions: ${territory === 'all' ? '+8.7%' : '+12.5%'} vs période précédente\n` +
        `💰 Croissance du panier moyen: ${territory === 'all' ? '+6.2%' : '+8.3%'} vs période précédente\n\n` +
        `Les tendances montrent une accélération de l'activité, particulièrement marquée pour ${territory === 'all' ? 'la Martinique et la Guyane' : territory}. ` +
        `Cette croissance s'explique par une meilleure adoption de la plateforme et des offres attractives mises en place.\n\n` +
        `⚠️ Points d'attention: ` +
        `${territory === 'guadeloupe' ? 'La Guadeloupe montre une légère baisse (-5.2%) qui nécessite une attention particulière.' : 'Aucun point critique identifié pour le moment.'}`,

      actionPlan: [
        {
          type: 'boost',
          title: 'Boost week-end spécial',
          description: `Lancer un boost de +20% sur les transactions du vendredi et samedi pour ${territoryName}. ` +
            `Cible les heures de pointe (18h-21h) où l'activité est déjà élevée.`,
          expectedImpact: 'Augmentation estimée de 15-20% des transactions week-end',
        },
        {
          type: 'lottery',
          title: 'Loterie mensuelle secteur Restauration',
          description: `Créer une loterie mensuelle avec des lots attractifs (repas, cartes cadeaux) ` +
            `pour inciter les utilisateurs à utiliser la plateforme dans le secteur Restauration.`,
          expectedImpact: 'Engagement accru dans le secteur Restauration, +10% de transactions',
        },
        {
          type: 'challenge',
          title: 'Défi panier moyen',
          description: `Mettre en place un challenge mensuel récompensant les utilisateurs qui atteignent un panier moyen supérieur à 50€. ` +
            `Badge spécial et points bonus à la clé.`,
          expectedImpact: 'Amélioration du panier moyen de 5-8%',
        },
        {
          type: 'boost',
          title: 'Boost heures creuses',
          description: `Proposer des boosts ciblés (09h-12h et 15h-18h) pour répartir l'activité sur toute la journée ` +
            `et réduire la pression sur les heures de pointe.`,
          expectedImpact: 'Répartition plus équilibrée de l\'activité, +8% de transactions globales',
        },
      ],
    };

    return ok(analysis, 'Analyse IA récupérée avec succès');
  }),
  http.get(`${API_URL}/admin/users`, async ({ request }) => {
    const url = new URL(request.url);
    const filters: UsersFilters = {
      search: url.searchParams.get('search') ?? undefined,
      status: (url.searchParams.get('status') as UsersFilters['status']) ?? 'all',
      territory: (url.searchParams.get('territory') as UsersFilters['territory']) ?? 'all',
      page: pickNumber(url.searchParams.get('page'), 1),
      pageSize: pickNumber(url.searchParams.get('pageSize'), 20),
    };
    const filtered = db.users.filter((user) =>
      matchFilters(filters, user.territory, user.status, user.fullName, user.email),
    );
    const start = ((filters.page ?? 1) - 1) * (filters.pageSize ?? 20);
    const items = filtered.slice(start, start + (filters.pageSize ?? 20));
    return ok({
      items,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      total: filtered.length,
    });
  }),
  http.get(`${API_URL}/admin/users/:userId/transactions`, async ({ params }) => {
    const { userId } = params as { userId: string };
    const items = db.transactions.filter((transaction) => transaction.userId === userId).slice(0, 10);
    return ok(items, 'Transactions de l\'utilisateur récupérées avec succès');
  }),
  http.get(`${API_URL}/admin/users/:userId/rewards/history`, async () => ok(db.rewards.boosts, 'Historique des récompenses récupéré avec succès')),
  http.get(`${API_URL}/admin/users/:userId/gift-cards`, async () => ok(db.giftCardOrders, 'Cartes cadeaux de l\'utilisateur récupérées avec succès')),
  http.get(`${API_URL}/admin/users/:userId/statistics`, async ({ params }) => {
    const { userId } = params as { userId: string };
    const user = db.users.find((u) => u.id === userId);
    if (!user) return failure('Utilisateur introuvable', 404);

    // Générer des statistiques mockées basées sur les transactions de l'utilisateur
    const userTransactions = db.transactions.filter((t) => t.userId === userId);
    const totalTransactions = userTransactions.length;
    const totalAmount = userTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const averageBasket = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Récupérer les partenaires uniques
    const partnerIds = Array.from(new Set(userTransactions.map((t) => t.partnerId).filter(Boolean)));
    const uniquePartners = partnerIds.length;

    // Répartition par secteur (basé sur les catégories des partenaires)
    const sectorCounts: Record<string, number> = {};
    partnerIds.forEach((partnerId) => {
      const partner = db.partners.find((p) => p.id === partnerId);
      if (partner) {
        sectorCounts[partner.category] = (sectorCounts[partner.category] || 0) + 1;
      }
    });
    const sectorDistribution = Object.entries(sectorCounts).map(([name, value]) => ({ name, value }));

    // Générer des données d'évolution
    const transactionEvolution = Array.from({ length: 30 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        transactions: Math.floor(Math.random() * 10) + 1,
      };
    });

    const averageBasketEvolution = Array.from({ length: 30 }).map((_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - index));
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        averageBasket: Math.round((averageBasket + (Math.random() * 20 - 10)) * 10) / 10,
      };
    });

    // Répartition par jour
    const dayDistribution = [
      { day: 'Lun', transactions: Math.floor(Math.random() * 20) + 10 },
      { day: 'Mar', transactions: Math.floor(Math.random() * 20) + 15 },
      { day: 'Mer', transactions: Math.floor(Math.random() * 20) + 12 },
      { day: 'Jeu', transactions: Math.floor(Math.random() * 20) + 18 },
      { day: 'Ven', transactions: Math.floor(Math.random() * 20) + 25 },
      { day: 'Sam', transactions: Math.floor(Math.random() * 20) + 20 },
      { day: 'Dim', transactions: Math.floor(Math.random() * 20) + 8 },
    ];

    // Répartition par heure
    const hourDistribution = [
      { hour: '00-06', transactions: Math.floor(Math.random() * 5) },
      { hour: '06-09', transactions: Math.floor(Math.random() * 10) + 5 },
      { hour: '09-12', transactions: Math.floor(Math.random() * 15) + 10 },
      { hour: '12-15', transactions: Math.floor(Math.random() * 20) + 15 },
      { hour: '15-18', transactions: Math.floor(Math.random() * 20) + 18 },
      { hour: '18-21', transactions: Math.floor(Math.random() * 25) + 20 },
      { hour: '21-24', transactions: Math.floor(Math.random() * 15) + 10 },
    ];

    const stats = {
      totalTransactions,
      averageBasket: Math.round(averageBasket * 10) / 10,
      totalAmount: Math.round(totalAmount),
      uniquePartners,
      transactionEvolution,
      averageBasketEvolution,
      sectorDistribution: sectorDistribution.length > 0 ? sectorDistribution : [
        { name: 'Restauration', value: 15 },
        { name: 'Retail', value: 12 },
        { name: 'Culture', value: 8 },
        { name: 'Mobilité', value: 5 },
      ],
      dayDistribution,
      hourDistribution,
    };

    return ok(stats, 'Statistiques de l\'utilisateur récupérées avec succès');
  }),
  http.post(`${API_URL}/admin/users/:userId/reset-password`, async ({ params }) => {
    const { userId } = params as { userId: string };
    db.auditLogs.unshift({
      id: makeId(),
      actor: db.adminUser.fullName,
      action: `Reset password ${userId}`,
      createdAt: new Date().toISOString(),
      metadata: `userId=${userId}`,
    });
    return ok(null, 'Mot de passe réinitialisé avec succès');
  }),
  http.patch(`${API_URL}/admin/users/:userId/kyc/force`, async ({ params }) => {
    const { userId } = params as { userId: string };
    const user = db.users.find((candidate) => candidate.id === userId);
    if (!user) return failure('Utilisateur introuvable', 404);
    user.status = 'active';
    user.kycLevel = 'advanced';
    user.wallet.updatedAt = new Date().toISOString();
    return ok(user, 'KYC forcé avec succès');
  }),
  http.get(`${API_URL}/partners`, async ({ request }) => {
    const url = new URL(request.url);
    const territory = url.searchParams.get('territory');
    const category = url.searchParams.get('category');
    const categoryId = url.searchParams.get('categoryId');
    const search = url.searchParams.get('search')?.toLowerCase();
    const page = pickNumber(url.searchParams.get('page'), 1);
    const limit = pickNumber(url.searchParams.get('limit'), 20);
    const sortBy = url.searchParams.get('sortBy') || 'name';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    let result = [...db.partners];
    
    // Filtrer par territoire
    if (territory && territory !== 'all') {
      result = result.filter((partner) => {
        // Support des nouveaux territoires (array) et ancien (string)
        if (partner.territories && Array.isArray(partner.territories)) {
          return partner.territories.includes(territory);
        }
        return partner.territory === territory;
      });
    }
    
    // Filtrer par catégorie (support des catégories multiples)
    if (category && category.trim() !== '') {
      result = result.filter((partner) => {
        // Support des nouvelles catégories (array) et ancien (string)
        if (partner.categories && Array.isArray(partner.categories)) {
          return partner.categories.includes(category);
        }
        return partner.category === category;
      });
    }
    
    // Filtrer par categoryId
    if (categoryId) {
      // Pour les mocks, on ignore categoryId car on n'a pas d'ID réel
      // En production, cela serait géré par le backend
    }
    
    // Recherche textuelle
    if (search) {
      result = result.filter(
        (partner) => {
          const nameMatch = partner.name.toLowerCase().includes(search);
          const categoryMatch = partner.category?.toLowerCase().includes(search) || false;
          const categoriesMatch = partner.categories?.some(c => c.toLowerCase().includes(search)) || false;
          return nameMatch || categoryMatch || categoriesMatch;
        }
      );
    }
    
    // Trier
    result.sort((a, b) => {
      let aValue: number | string = 0;
      let bValue: number | string = 0;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        case 'updatedAt':
          // Pas de champ updatedAt dans les mocks, utiliser createdAt
          aValue = a.createdAt || '';
          bValue = b.createdAt || '';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      return sortOrder === 'asc' 
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    });
    
    // Pagination
    const total = result.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedResult = result.slice(start, start + limit);
    
    return ok(paginatedResult, 'Liste des partenaires récupérée avec succès', {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  }),
  // ⚠️ IMPORTANT : Ce handler doit être AVANT /partners/:partnerId pour que MSW le matche correctement
  http.get(`${API_URL}/partners/categories`, async () => {
    // S'assurer que partnerCategories existe et est un tableau
    if (!db.partnerCategories || !Array.isArray(db.partnerCategories)) {
      // Régénérer les catégories à partir des partenaires si nécessaire
      db.partnerCategories = Array.from(
        new Set(
          db.partners.flatMap((p) => {
            if (p.categories && Array.isArray(p.categories) && p.categories.length > 0) {
              return p.categories;
            }
            return p.category ? [p.category] : [];
          })
        )
      );
    }
    return ok(db.partnerCategories || [], 'Catégories récupérées avec succès');
  }),
  http.get(`${API_URL}/partners/:partnerId`, async ({ params }) => {
    const { partnerId } = params as { partnerId: string };
    const partner = db.partners.find((item) => item.id === partnerId);
    if (!partner) return failure('Partenaire introuvable', 404);
    
    // Log pour déboguer les images
    if (import.meta.env.DEV) {
      console.log('[MSW] GET /partners/:partnerId - Images du partenaire:', {
        id: partner.id,
        name: partner.name,
        logoUrl: partner.logoUrl ? (partner.logoUrl.startsWith('data:') ? `data URL (${partner.logoUrl.length} chars)` : partner.logoUrl.substring(0, 50)) : 'null',
        giftCardImageUrl: partner.giftCardImageUrl ? (partner.giftCardImageUrl.startsWith('data:') ? `data URL (${partner.giftCardImageUrl.length} chars)` : partner.giftCardImageUrl.substring(0, 50)) : 'null',
        menuImages: partner.menuImages ? `${partner.menuImages.length} images (${partner.menuImages.every((img: string) => img.startsWith('data:')) ? 'toutes data URLs' : 'mix'})` : 'null',
        photos: partner.photos ? `${partner.photos.length} photos (${partner.photos.every((img: string) => img.startsWith('data:')) ? 'toutes data URLs' : 'mix'})` : 'null',
      });
    }
    
    // S'assurer que toutes les images sont des data URLs valides
    // Si une image n'est pas une data URL, la convertir ou la supprimer
    const cleanedPartner = { ...partner };
    if (cleanedPartner.logoUrl && !cleanedPartner.logoUrl.startsWith('data:') && !cleanedPartner.logoUrl.startsWith('http')) {
      cleanedPartner.logoUrl = undefined;
    }
    if (cleanedPartner.giftCardImageUrl && !cleanedPartner.giftCardImageUrl.startsWith('data:') && !cleanedPartner.giftCardImageUrl.startsWith('http')) {
      cleanedPartner.giftCardImageUrl = undefined;
    }
    if (cleanedPartner.giftCardVirtualCardImageUrl && !cleanedPartner.giftCardVirtualCardImageUrl.startsWith('data:') && !cleanedPartner.giftCardVirtualCardImageUrl.startsWith('http')) {
      cleanedPartner.giftCardVirtualCardImageUrl = undefined;
    }
    if (cleanedPartner.menuImages && Array.isArray(cleanedPartner.menuImages)) {
      cleanedPartner.menuImages = cleanedPartner.menuImages.filter((img: string) => 
        img && typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http'))
      );
    }
    if (cleanedPartner.photos && Array.isArray(cleanedPartner.photos)) {
      cleanedPartner.photos = cleanedPartner.photos.filter((img: string) => 
        img && typeof img === 'string' && (img.startsWith('data:') || img.startsWith('http'))
      );
    }
    
    return ok(cleanedPartner, 'Partenaire récupéré avec succès');
  }),
  http.post(`${API_URL}/partners`, async ({ request }) => {
    const formData = await request.formData();
    
    // Gérer les territoires : peut être envoyé comme JSON string ou comme array
    // Accepter les territoires tels quels, sans transformation
    let territories: Territory[] = [];
    const territoriesValue = formData.get('territories');
    if (territoriesValue) {
      try {
        // Si c'est un JSON string, le parser
        if (typeof territoriesValue === 'string') {
          const parsed = JSON.parse(territoriesValue);
          if (Array.isArray(parsed)) {
            // Accepter les territoires tels quels, mais normaliser pour la validation
            territories = parsed
              .map((t: string) => String(t).toLowerCase())
              .filter((t: string): t is Territory => 
                t === 'martinique' || t === 'guadeloupe' || t === 'guyane'
              );
          }
        } else if (Array.isArray(territoriesValue)) {
          territories = territoriesValue
            .map((t) => String(t).toLowerCase())
            .filter((t): t is Territory => 
              t === 'martinique' || t === 'guadeloupe' || t === 'guyane'
            );
        }
      } catch (error) {
        // Si le parsing échoue, essayer comme string simple
        const territoryStr = String(territoriesValue).toLowerCase();
        if (territoryStr === 'martinique' || territoryStr === 'guadeloupe' || territoryStr === 'guyane') {
          territories = [territoryStr as Territory];
        }
      }
    }
    
    // Valider qu'au moins un territoire est fourni
    if (territories.length === 0) {
      return failure('Au moins un territoire doit être sélectionné', 400, 'VALIDATION_ERROR', {
        territories: ['Au moins un territoire doit être sélectionné'],
      });
    }
    
    // Gérer les catégories : peut être envoyé comme JSON string ou comme array
    let categories: string[] = [];
    const categoriesValue = formData.get('categories');
    if (categoriesValue) {
      try {
        if (typeof categoriesValue === 'string') {
          const parsed = JSON.parse(categoriesValue);
          if (Array.isArray(parsed)) {
            categories = parsed.map((c: string) => String(c));
          }
        } else if (Array.isArray(categoriesValue)) {
          categories = categoriesValue.map((c) => String(c));
        }
      } catch (error) {
        // Si le parsing échoue, essayer comme string simple
        categories = [String(categoriesValue)];
      }
    }
    
    // Si aucune catégorie n'est fournie via categories, utiliser category (ancien format)
    if (categories.length === 0) {
      const categoryValue = formData.get('category') ?? formData.get('categoryId');
      if (categoryValue) {
        categories = [String(categoryValue)];
      }
    }
    
    // Valider qu'au moins une catégorie est fournie
    if (categories.length === 0) {
      return failure('Au moins une catégorie doit être sélectionnée', 400, 'VALIDATION_ERROR', {
        categories: ['Au moins une catégorie doit être sélectionnée'],
      });
    }
    
    // Pour compatibilité avec l'ancien format, utiliser la première catégorie comme category
    const category = categories[0];
    // Pour compatibilité avec l'ancien format, utiliser le premier territoire comme territory
    const territory = territories[0] as Partner['territory'];
    
    const partner: Partner = {
      id: makeId(),
      name: String(formData.get('name') ?? ''),
      siret: formData.get('siret') ? String(formData.get('siret')) : undefined,
      category, // Pour compatibilité
      categories: categories.length > 0 ? categories : undefined, // Nouveau format
      territory, // Pour compatibilité
      territories: territories.length > 0 ? territories as Territory[] : undefined, // Nouveau format
      status: (formData.get('status') as Partner['status']) ?? 'pending',
      createdAt: new Date().toISOString(),
      logoUrl: formData.get('logo') ? await convertFileToDataUrl(formData.get('logo') as File) : undefined,
      kbisUrl: formData.get('kbis') ? await convertFileToDataUrl(formData.get('kbis') as File) : undefined,
      discoveryCashbackRate: formData.get('discoveryCashbackRate')
        ? Number(formData.get('discoveryCashbackRate'))
        : undefined,
      permanentCashbackRate: formData.get('permanentCashbackRate')
        ? Number(formData.get('permanentCashbackRate'))
        : undefined,
      welcomeAffiliationAmount: formData.get('welcomeAffiliationAmount')
        ? Number(formData.get('welcomeAffiliationAmount'))
        : undefined,
      permanentAffiliationAmount: formData.get('permanentAffiliationAmount')
        ? Number(formData.get('permanentAffiliationAmount'))
        : undefined,
      welcomeUserRate: formData.get('welcomeUserRate') ? Number(formData.get('welcomeUserRate')) : undefined,
      welcomeKashUPRate: formData.get('welcomeKashUPRate') ? Number(formData.get('welcomeKashUPRate')) : undefined,
      permanentUserRate: formData.get('permanentUserRate') ? Number(formData.get('permanentUserRate')) : undefined,
      permanentKashUPRate: formData.get('permanentKashUPRate')
        ? Number(formData.get('permanentKashUPRate'))
        : undefined,
      giftCardEnabled: formData.get('giftCardEnabled') === 'true',
      giftCardCashbackRate: formData.get('giftCardCashbackRate')
        ? Number(formData.get('giftCardCashbackRate'))
        : undefined,
      giftCardDescription: formData.get('giftCardDescription')
        ? String(formData.get('giftCardDescription'))
        : undefined,
      giftCardImageUrl: formData.get('giftCardImage')
        ? await convertFileToDataUrl(formData.get('giftCardImage') as File)
        : undefined,
      giftCardVirtualCardImageUrl: formData.get('giftCardVirtualCardImage')
        ? await convertFileToDataUrl(formData.get('giftCardVirtualCardImage') as File)
        : undefined,
      boostEnabled: formData.get('boostEnabled') === 'true',
      boostRate: formData.get('boostRate') ? Number(formData.get('boostRate')) : undefined,
      address: formData.get('address') ? String(formData.get('address')) : undefined,
      pointsPerTransaction: formData.get('pointsPerTransaction')
        ? Number(formData.get('pointsPerTransaction'))
        : undefined,
      marketingPrograms: formData.get('marketingPrograms')
        ? JSON.parse(String(formData.get('marketingPrograms')))
        : [],
      featuredOffers: formData.get('featuredOffers')
        ? JSON.parse(String(formData.get('featuredOffers')))
        : [],
      // Informations complémentaires
      phone: formData.get('phone') ? String(formData.get('phone')) : undefined,
      instagramUrl: formData.get('instagramUrl') ? String(formData.get('instagramUrl')) : undefined,
      facebookUrl: formData.get('facebookUrl') ? String(formData.get('facebookUrl')) : undefined,
      openingHours: formData.get('openingHoursStart') || formData.get('openingHoursEnd')
        ? {
            start: formData.get('openingHoursStart') ? String(formData.get('openingHoursStart')) : '',
            end: formData.get('openingHoursEnd') ? String(formData.get('openingHoursEnd')) : '',
          }
        : undefined,
      openingDays: formData.getAll('openingDays[]').length > 0
        ? formData.getAll('openingDays[]') as Partner['openingDays']
        : undefined,
      menuImages: formData.getAll('menuImages[]').length > 0
        ? await Promise.all(
            formData.getAll('menuImages[]').map(async (file) => {
              const f = file as File;
              return await convertFileToDataUrl(f);
            })
          )
        : undefined,
      photos: formData.getAll('photos[]').length > 0
        ? await Promise.all(
            formData.getAll('photos[]').map(async (file) => {
              const f = file as File;
              return await convertFileToDataUrl(f);
            })
          )
        : undefined,
    };
    db.partners.unshift(partner);
    // Ajouter toutes les catégories à la liste des catégories disponibles
    categories.forEach((cat) => {
      if (!db.partnerCategories.includes(cat)) {
        db.partnerCategories.push(cat);
      }
    });
    return ok(partner, 'Partenaire créé avec succès');
  }),
  http.patch(`${API_URL}/partners/:partnerId`, async ({ params, request }) => {
    const { partnerId } = params as { partnerId: string };
    const partner = db.partners.find((item) => item.id === partnerId);
    if (!partner) return failure('Partenaire introuvable', 404);
    const formData = await request.formData();
    if (formData.get('name')) partner.name = String(formData.get('name'));
    if (formData.get('siret')) partner.siret = String(formData.get('siret'));
    
    // Gérer les catégories : peut être envoyé comme JSON string ou comme array
    const categoriesValue = formData.get('categories');
    if (categoriesValue) {
      try {
        let categories: string[] = [];
        if (typeof categoriesValue === 'string') {
          const parsed = JSON.parse(categoriesValue);
          if (Array.isArray(parsed)) {
            categories = parsed.map((c: string) => String(c));
          }
        } else if (Array.isArray(categoriesValue)) {
          categories = categoriesValue.map((c) => String(c));
        }
        if (categories.length > 0) {
          partner.categories = categories;
          partner.category = categories[0]; // Pour compatibilité
          // Ajouter les nouvelles catégories à la liste
          categories.forEach((cat) => {
            if (!db.partnerCategories.includes(cat)) {
              db.partnerCategories.push(cat);
            }
          });
        }
      } catch (error) {
        // Si le parsing échoue, ignorer (ne pas bloquer la mise à jour)
        if (import.meta.env.DEV) {
          console.warn('⚠️ Erreur lors du parsing des catégories:', error);
        }
      }
    }
    
    // Support de l'ancien format category (string unique) pour compatibilité
    if (formData.get('category') && !formData.get('categories')) {
      const categoryValue = String(formData.get('category'));
      partner.category = categoryValue;
      partner.categories = [categoryValue];
    }
    if (formData.get('categoryId') && !formData.get('categories')) {
      const categoryIdValue = String(formData.get('categoryId'));
      partner.category = categoryIdValue;
      partner.categories = [categoryIdValue];
    }
    
    // Gérer les territoires : peut être envoyé comme JSON string ou comme array
    // Accepter les territoires tels quels, sans transformation
    const territoriesValue = formData.get('territories');
    if (territoriesValue) {
      try {
        let territories: Territory[] = [];
        if (typeof territoriesValue === 'string') {
          const parsed = JSON.parse(territoriesValue);
          if (Array.isArray(parsed)) {
            // Accepter les territoires tels quels, mais normaliser pour la validation
            territories = parsed
              .map((t: string) => String(t).toLowerCase())
              .filter((t: string): t is Territory => 
                t === 'martinique' || t === 'guadeloupe' || t === 'guyane'
              );
          }
        } else if (Array.isArray(territoriesValue)) {
          territories = territoriesValue
            .map((t) => String(t).toLowerCase())
            .filter((t): t is Territory => 
              t === 'martinique' || t === 'guadeloupe' || t === 'guyane'
            );
        }
        if (territories.length > 0) {
          partner.territories = territories;
          partner.territory = territories[0] as Partner['territory']; // Pour compatibilité
        }
      } catch (error) {
        // Si le parsing échoue, ignorer (ne pas bloquer la mise à jour)
        if (import.meta.env.DEV) {
          console.warn('⚠️ Erreur lors du parsing des territoires:', error);
        }
      }
    }
    
    // Support de l'ancien format territory (string unique) pour compatibilité
    if (formData.get('territory') && !formData.get('territories')) {
      const territoryValue = String(formData.get('territory')).toLowerCase();
      if (territoryValue === 'martinique' || territoryValue === 'guadeloupe' || territoryValue === 'guyane') {
        partner.territory = territoryValue as Partner['territory'];
        partner.territories = [territoryValue as Territory];
      }
    }
    
    if (formData.get('status')) partner.status = formData.get('status') as Partner['status'];
    if (formData.get('logo'))
      partner.logoUrl = await convertFileToDataUrl(formData.get('logo') as File);
    if (formData.get('kbis'))
      partner.kbisUrl = await convertFileToDataUrl(formData.get('kbis') as File);
    if (formData.get('discoveryCashbackRate'))
      partner.discoveryCashbackRate = Number(formData.get('discoveryCashbackRate'));
    if (formData.get('permanentCashbackRate'))
      partner.permanentCashbackRate = Number(formData.get('permanentCashbackRate'));
    if (formData.get('welcomeAffiliationAmount'))
      partner.welcomeAffiliationAmount = Number(formData.get('welcomeAffiliationAmount'));
    if (formData.get('permanentAffiliationAmount'))
      partner.permanentAffiliationAmount = Number(formData.get('permanentAffiliationAmount'));
    if (formData.get('welcomeUserRate')) partner.welcomeUserRate = Number(formData.get('welcomeUserRate'));
    if (formData.get('welcomeKashUPRate'))
      partner.welcomeKashUPRate = Number(formData.get('welcomeKashUPRate'));
    if (formData.get('permanentUserRate'))
      partner.permanentUserRate = Number(formData.get('permanentUserRate'));
    if (formData.get('permanentKashUPRate'))
      partner.permanentKashUPRate = Number(formData.get('permanentKashUPRate'));
    if (formData.get('giftCardEnabled') !== null)
      partner.giftCardEnabled = formData.get('giftCardEnabled') === 'true';
    if (formData.get('giftCardCashbackRate'))
      partner.giftCardCashbackRate = Number(formData.get('giftCardCashbackRate'));
    if (formData.get('giftCardDescription'))
      partner.giftCardDescription = String(formData.get('giftCardDescription'));
    if (formData.get('giftCardImage'))
      partner.giftCardImageUrl = await convertFileToDataUrl(formData.get('giftCardImage') as File);
    if (formData.get('giftCardVirtualCardImage'))
      partner.giftCardVirtualCardImageUrl = await convertFileToDataUrl(
        formData.get('giftCardVirtualCardImage') as File,
      );
    if (formData.get('boostEnabled') !== null)
      partner.boostEnabled = formData.get('boostEnabled') === 'true';
    if (formData.get('boostRate')) partner.boostRate = Number(formData.get('boostRate'));
    if (formData.get('address')) partner.address = String(formData.get('address'));
    if (formData.get('pointsPerTransaction'))
      partner.pointsPerTransaction = Number(formData.get('pointsPerTransaction'));
    if (formData.get('marketingPrograms'))
      partner.marketingPrograms = JSON.parse(String(formData.get('marketingPrograms')));
    if (formData.get('featuredOffers'))
      partner.featuredOffers = JSON.parse(String(formData.get('featuredOffers')));
    
    // Informations complémentaires
    if (formData.get('phone') !== undefined) partner.phone = formData.get('phone') ? String(formData.get('phone')) : undefined;
    if (formData.get('instagramUrl') !== undefined) partner.instagramUrl = formData.get('instagramUrl') ? String(formData.get('instagramUrl')) : undefined;
    if (formData.get('facebookUrl') !== undefined) partner.facebookUrl = formData.get('facebookUrl') ? String(formData.get('facebookUrl')) : undefined;
    
    // Horaires d'ouverture
    if (formData.get('openingHoursStart') !== undefined || formData.get('openingHoursEnd') !== undefined) {
      partner.openingHours = {
        start: formData.get('openingHoursStart') ? String(formData.get('openingHoursStart')) : partner.openingHours?.start || '',
        end: formData.get('openingHoursEnd') ? String(formData.get('openingHoursEnd')) : partner.openingHours?.end || '',
      };
    }
    
    // Jours d'ouverture
    const openingDaysValues = formData.getAll('openingDays[]');
    if (openingDaysValues.length > 0) {
      partner.openingDays = openingDaysValues as Partner['openingDays'];
    }
    
    // Images de menu
    const menuImagesFiles = formData.getAll('menuImages[]');
    if (menuImagesFiles.length > 0) {
      partner.menuImages = await Promise.all(
        menuImagesFiles.map(async (file) => {
          const f = file as File;
          return await convertFileToDataUrl(f);
        })
      );
    }
    
    // Photos
    const photosFiles = formData.getAll('photos[]');
    if (photosFiles.length > 0) {
      partner.photos = await Promise.all(
        photosFiles.map(async (file) => {
          const f = file as File;
          return await convertFileToDataUrl(f);
        })
      );
    }
    
    return ok(partner, 'Partenaire mis à jour avec succès');
  }),
  http.get(`${API_URL}/partners/:partnerId/statistics`, async ({ params }) => {
    const { partnerId } = params as { partnerId: string };
    const partner = db.partners.find((item) => item.id === partnerId);
    if (!partner) return failure('Partenaire introuvable', 404);

    // Générer des statistiques mockées
    const transactionGrowth = partner.transactionGrowth ?? 0;
    const averageBasketGrowth = partner.averageBasketGrowth ?? 0;

    const stats = {
      totalTransactions: 1247,
      totalAmount: 45680,
      featuredOffersSold: 89,
      activeUsers: 342,
      transactionGrowth,
      averageBasketGrowth,
      ageDistribution: [
        { name: '18-25 ans', value: 245 },
        { name: '26-35 ans', value: 456 },
        { name: '36-45 ans', value: 312 },
        { name: '46-55 ans', value: 178 },
        { name: '56+ ans', value: 56 },
      ],
      genderDistribution: [
        { name: 'Homme', value: 612 },
        { name: 'Femme', value: 635 },
      ],
      dayDistribution: [
        { day: 'Lun', transactions: 145 },
        { day: 'Mar', transactions: 178 },
        { day: 'Mer', transactions: 201 },
        { day: 'Jeu', transactions: 189 },
        { day: 'Ven', transactions: 234 },
        { day: 'Sam', transactions: 198 },
        { day: 'Dim', transactions: 102 },
      ],
      hourDistribution: [
        { hour: '00-06', transactions: 12 },
        { hour: '06-09', transactions: 45 },
        { hour: '09-12', transactions: 178 },
        { hour: '12-15', transactions: 234 },
        { hour: '15-18', transactions: 289 },
        { hour: '18-21', transactions: 312 },
        { hour: '21-24', transactions: 177 },
      ],
      dailyEvolution: Array.from({ length: 7 }).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return {
          date: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          transactions: 120 + Math.floor(Math.random() * 80),
          amount: 3500 + Math.floor(Math.random() * 2000),
        };
      }),
      transactionEvolution: Array.from({ length: 30 }).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - index));
        const baseTransactions = 150;
        const growthFactor = 1 + transactionGrowth / 100;
        const transactions = Math.round(baseTransactions * Math.pow(growthFactor, index / 10));
        return {
          date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          transactions,
          growth: transactionGrowth + (Math.random() * 5 - 2.5), // Variation autour de la croissance
        };
      }),
      averageBasketEvolution: Array.from({ length: 30 }).map((_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - index));
        const baseBasket = 45;
        const growthFactor = 1 + averageBasketGrowth / 100;
        const averageBasket = Math.round(baseBasket * Math.pow(growthFactor, index / 10) * 10) / 10;
        return {
          date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
          averageBasket,
          growth: averageBasketGrowth + (Math.random() * 5 - 2.5), // Variation autour de la croissance
        };
      }),
    };
    return ok(stats, 'Statistiques du partenaire récupérées avec succès');
  }),
  http.get(`${API_URL}/partners/:partnerId/documents`, async ({ params }) => {
    const { partnerId } = params as { partnerId: string };
    const partner = db.partners.find((item) => item.id === partnerId);
    if (!partner) return failure('Partenaire introuvable', 404);

    // Récupérer les documents depuis la base de données mockée
    // Si aucun document n'existe pour ce partenaire, retourner un tableau vide
    const documents = (db.partnerDocuments || []).filter((doc: PartnerDocument) => doc.partnerId === partnerId);

    return ok(documents, 'Documents du partenaire récupérés avec succès');
  }),
  http.post(`${API_URL}/partners/:partnerId/documents`, async ({ params, request }) => {
    const { partnerId } = params as { partnerId: string };
    const partner = db.partners.find((item) => item.id === partnerId);
    if (!partner) return failure('Partenaire introuvable', 404);

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as 'invoice' | 'commercial_analysis' | 'contract' | 'other';
    const file = formData.get('file') as File | null;

    if (!name || !type || !file) {
      return failure('Le nom, le type et le fichier sont obligatoires', 400);
    }

    // Convertir le fichier en data URL
    const fileUrl = await convertFileToDataUrl(file);
    const fileSize = (file.size / (1024 * 1024)).toFixed(2) + ' MB';

    const document: PartnerDocument = {
      id: makeId(),
      partnerId,
      name,
      type,
      url: fileUrl,
      size: fileSize,
      createdAt: new Date().toISOString(),
    };

    // Initialiser le tableau si nécessaire
    if (!db.partnerDocuments) {
      db.partnerDocuments = [];
    }
    db.partnerDocuments.push(document);

    return ok(document, 'Document ajouté avec succès');
  }),
  http.delete(`${API_URL}/partners/:partnerId/documents/:documentId`, async ({ params }) => {
    const { partnerId, documentId } = params as { partnerId: string; documentId: string };
    const partner = db.partners.find((item) => item.id === partnerId);
    if (!partner) return failure('Partenaire introuvable', 404);

    if (!db.partnerDocuments) {
      return failure('Document introuvable', 404);
    }

    const index = db.partnerDocuments.findIndex((doc: PartnerDocument) => doc.id === documentId && doc.partnerId === partnerId);
    if (index === -1) {
      return failure('Document introuvable', 404);
    }

    db.partnerDocuments.splice(index, 1);
    return ok(null, 'Document supprimé avec succès');
  }),
  http.get(`${API_URL}/offers/current`, async () => ok(db.offers, 'Offres actuelles récupérées avec succès')),
  http.post(`${API_URL}/offers`, async ({ request }) => {
    const contentType = request.headers.get('content-type');
    let payload: OfferFormInput;
    let imageUrl: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const partnerId = formData.get('partnerId') as string;
      const partner = db.partners.find((p) => p.id === partnerId);
      
      payload = {
        partnerId,
        title: formData.get('title') as string,
        price: formData.get('price') ? parseFloat(formData.get('price') as string) : undefined,
        cashbackRate: parseFloat(formData.get('cashbackRate') as string),
        startAt: formData.get('startAt') as string,
        endAt: formData.get('endAt') as string,
        stock: parseInt(formData.get('stock') as string, 10),
      };
      
      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        // Convertir l'image en data URL comme pour les autres entités
        imageUrl = await convertFileToDataUrl(imageFile);
      }
    } else {
      payload = (await request.json()) as OfferFormInput;
    }

    const partner = db.partners.find((p) => p.id === payload.partnerId);
    const now = new Date();
    const startDate = new Date(payload.startAt);
    const endDate = new Date(payload.endAt);
    
    let status: 'scheduled' | 'active' | 'expired' = 'scheduled';
    if (now >= startDate && now <= endDate) {
      status = 'active';
    } else if (now > endDate) {
      status = 'expired';
    }

    const offer: Offer = {
      id: makeId(),
      partnerId: payload.partnerId,
      partnerName: partner?.name,
      partnerLogoUrl: partner?.logoUrl,
      title: payload.title,
      price: payload.price,
      cashbackRate: payload.cashbackRate,
      startAt: payload.startAt,
      endAt: payload.endAt,
      stock: payload.stock,
      stockUsed: 0,
      imageUrl,
      status,
    };
    db.offers.unshift(offer);
    return ok(offer, 'Offre créée avec succès');
  }),
  http.get(`${API_URL}/rewards`, async () => ok(db.rewards, 'Récompenses récupérées avec succès')),
  http.get(`${API_URL}/rewards/:type`, async ({ params }) => {
    const { type } = params as { type: 'boost' | 'badge' | 'lottery' | 'challenge' };
    const typeMap: Record<string, keyof typeof db.rewards> = {
      boost: 'boosts',
      badge: 'badges',
      lottery: 'lotteries',
      challenge: 'challenges',
    };
    const rewards = db.rewards[typeMap[type]] as Reward[];
    return ok(rewards || [], `Récompenses de type ${type} récupérées avec succès`);
  }),
  http.post(`${API_URL}/rewards`, async ({ request }) => {
    const contentType = request.headers.get('content-type');
    let payload: RewardFormInput;
    let imageUrl: string | undefined;

    // Détecter les requêtes FormData (multipart/form-data ou tentative de parser FormData)
    let formData: FormData | null = null;
    try {
    if (contentType?.includes('multipart/form-data')) {
        formData = await request.formData();
      } else {
        // Essayer de parser comme FormData même si le Content-Type n'est pas défini
        // (le navigateur peut ne pas définir le Content-Type pour FormData)
        const clonedRequest = request.clone();
        try {
          formData = await clonedRequest.formData();
        } catch {
          // Si ça échoue, ce n'est probablement pas un FormData
        }
      }
    } catch {
      // Si ça échoue, ce n'est probablement pas un FormData
    }

    if (formData) {
      payload = {
        type: formData.get('type') as RewardFormInput['type'],
        title: formData.get('title') as string,
        duration: parseInt(formData.get('duration') as string, 10),
        stock: formData.get('stock') ? parseInt(formData.get('stock') as string, 10) : undefined,
        status: formData.get('status') as RewardFormInput['status'],
        boostRate: formData.get('boostRate') ? parseFloat(formData.get('boostRate') as string) : undefined,
        transactionCount: formData.get('transactionCount')
          ? parseInt(formData.get('transactionCount') as string, 10)
          : undefined,
        partnerCategory: (formData.get('partnerCategory') as string) || undefined,
        partnerId: (formData.get('partnerId') as string) || undefined,
        partnerCategoryFilter: (formData.get('partnerCategoryFilter') as string) || undefined,
        userType: (formData.get('userType') as string) || undefined,
        partnerIds: formData.getAll('partnerIds[]') as string[],
        startAt: (formData.get('startAt') as string) || undefined,
        endAt: (formData.get('endAt') as string) || undefined,
        pointsRequired: formData.get('pointsRequired')
          ? parseInt(formData.get('pointsRequired') as string, 10)
          : undefined,
        maxTicketsPerUser: formData.get('maxTicketsPerUser')
          ? formData.get('maxTicketsPerUser') === ''
            ? null
            : parseInt(formData.get('maxTicketsPerUser') as string, 10)
          : undefined,
        rules: (formData.get('rules') as string) || undefined,
        challengePartnerCategory: (formData.get('challengePartnerCategory') as string) || undefined,
        challengePartnerIds: formData.getAll('challengePartnerIds[]') as string[],
        challengeStartAt: (formData.get('challengeStartAt') as string) || undefined,
        challengeEndAt: (formData.get('challengeEndAt') as string) || undefined,
        challengeTransactionCount: formData.get('challengeTransactionCount')
          ? parseInt(formData.get('challengeTransactionCount') as string, 10)
          : undefined,
        conditions: (formData.get('conditions') as string) || undefined,
      };
      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        // Créer une data URL à partir du fichier pour que l'image soit accessible dans le navigateur
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          // Convertir en base64 de manière plus robuste pour les gros fichiers
          let binary = '';
          const chunkSize = 8192; // Traiter par chunks pour éviter les problèmes de mémoire
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image en base64:', error);
          // En cas d'erreur, utiliser une URL placeholder
          imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent(payload.title)}`;
        }
      }
    } else {
      payload = (await request.json()) as RewardFormInput;
    }

    const reward: Reward = {
      id: makeId(),
      type: payload.type,
      title: payload.title,
      status: payload.status,
      stock: payload.stock ?? 0,
      duration: payload.duration,
      boostRate: payload.boostRate,
      imageUrl,
      participantCount: 0,
      transactionCount: payload.transactionCount,
      partnerCategory: payload.partnerCategory,
      partnerId: payload.partnerId,
      partnerCategoryFilter: payload.partnerCategoryFilter,
      userType: payload.userType,
      partnerIds: payload.partnerIds,
      startAt: payload.startAt,
      endAt: payload.endAt,
      pointsRequired: payload.pointsRequired,
      maxTicketsPerUser: payload.maxTicketsPerUser,
      rules: payload.rules,
      challengePartnerCategory: payload.challengePartnerCategory,
      challengePartnerIds: payload.challengePartnerIds,
      challengeStartAt: payload.challengeStartAt,
      challengeEndAt: payload.challengeEndAt,
      challengeTransactionCount: payload.challengeTransactionCount,
      conditions: payload.conditions,
    };

    const typeMap: Record<string, keyof typeof db.rewards> = {
      boost: 'boosts',
      badge: 'badges',
      lottery: 'lotteries',
      challenge: 'challenges',
    };
    const rewardsArray = db.rewards[typeMap[payload.type]] as Reward[];
    rewardsArray.push(reward);
    return ok(reward, 'Récompense créée avec succès');
  }),
  http.post(`${API_URL}/rewards/:rewardId`, async ({ params, request }) => {
    const { rewardId } = params as { rewardId: string };
    const payload = (await request.json()) as Partial<RewardFormInput>;
    
    // Trouver le reward dans toutes les catégories
    let reward: Reward | undefined;
    for (const category of ['boosts', 'badges', 'lotteries', 'challenges'] as const) {
      reward = db.rewards[category].find((r) => r.id === rewardId);
      if (reward) break;
    }
    
    if (!reward) return failure('Récompense introuvable', 404);
    
    if (payload.title) reward.title = payload.title;
    if (payload.duration !== undefined) reward.duration = payload.duration;
    if (payload.stock !== undefined) reward.stock = payload.stock;
    if (payload.boostRate !== undefined) reward.boostRate = payload.boostRate;
    if (payload.status) reward.status = payload.status;
    if (payload.transactionCount !== undefined) reward.transactionCount = payload.transactionCount;
    if (payload.partnerCategory !== undefined) reward.partnerCategory = payload.partnerCategory;
    if (payload.partnerId !== undefined) reward.partnerId = payload.partnerId;
    if (payload.partnerCategoryFilter !== undefined) reward.partnerCategoryFilter = payload.partnerCategoryFilter;
    if (payload.userType !== undefined) reward.userType = payload.userType;
    if (payload.partnerIds !== undefined) reward.partnerIds = payload.partnerIds;
    if (payload.startAt !== undefined) reward.startAt = payload.startAt;
    if (payload.endAt !== undefined) reward.endAt = payload.endAt;
    if (payload.pointsRequired !== undefined) reward.pointsRequired = payload.pointsRequired;
    if (payload.maxTicketsPerUser !== undefined) reward.maxTicketsPerUser = payload.maxTicketsPerUser;
    if (payload.rules !== undefined) reward.rules = payload.rules;
    if (payload.challengePartnerCategory !== undefined) reward.challengePartnerCategory = payload.challengePartnerCategory;
    if (payload.challengePartnerIds !== undefined) reward.challengePartnerIds = payload.challengePartnerIds;
    if (payload.challengeStartAt !== undefined) reward.challengeStartAt = payload.challengeStartAt;
    if (payload.challengeEndAt !== undefined) reward.challengeEndAt = payload.challengeEndAt;
    if (payload.challengeTransactionCount !== undefined) reward.challengeTransactionCount = payload.challengeTransactionCount;
    if (payload.conditions !== undefined) reward.conditions = payload.conditions;
    
    return ok(reward, 'Récompense mise à jour avec succès');
  }),
  http.post(`${API_URL}/rewards/boosts/:rewardId/purchase`, async ({ params }) => {
    const { rewardId } = params as { rewardId: string };
    const reward = db.rewards.boosts.find((item) => item.id === rewardId);
    if (!reward) return failure('Récompense introuvable', 404);
    reward.stock = Math.max(0, reward.stock - 1);
    reward.participantCount = (reward.participantCount ?? 0) + 1;
    return ok(reward, 'Boost acheté avec succès');
  }),
  http.post(`${API_URL}/rewards/lotteries/:rewardId/join`, async ({ params }) => {
    const { rewardId } = params as { rewardId: string };
    const reward = db.rewards.lotteries.find((item) => item.id === rewardId);
    if (!reward) return failure('Récompense introuvable', 404);
    reward.participantCount = (reward.participantCount ?? 0) + 1;
    return ok(reward, 'Participation à la loterie enregistrée avec succès');
  }),
  http.get(`${API_URL}/gift-cards`, async () => ok(db.giftCards, 'Cartes cadeaux récupérées avec succès')),
  http.get(`${API_URL}/gift-cards/orders`, async () => ok(db.giftCardOrders, 'Commandes de cartes cadeaux récupérées avec succès')),
  http.post(`${API_URL}/gift-cards/purchase`, async ({ request }) => {
    const payload = (await request.json()) as GiftCardPurchaseInput;
    const order: GiftCardOrder = {
      id: payload.partnerId,
      partner: db.giftCards.find((card) => card.id === payload.partnerId)?.partner ?? 'Partenaire',
      value: payload.value,
      status: 'delivered',
      orderId: makeId(),
      code: `CODE-${Math.floor(Math.random() * 9999)}`,
      createdAt: new Date().toISOString(),
    };
    db.giftCardOrders.unshift(order);
    return ok(order, 'Carte cadeau achetée avec succès');
  }),
  http.get(`${API_URL}/gift-cards/export`, async () =>
    new HttpResponse('partner,value,status\nFnac,30,available', {
      headers: { 'Content-Type': 'text/csv' },
    }),
  ),
  // ============================================================================
  // HANDLERS - MONTANTS DE CARTES CADEAUX
  // ============================================================================
  http.get(`${API_URL}/gift-cards/amounts`, async () => ok(db.giftCardAmounts, 'Montants récupérés avec succès')),
  http.post(`${API_URL}/gift-cards/amounts`, async ({ request }) => {
    try {
      const payload = (await request.json()) as { amount: number };
      if (!payload || typeof payload.amount !== 'number') {
        return failure('Le montant est requis et doit être un nombre', 400);
      }
      const amount: GiftCardAmount = {
        id: makeId(),
        amount: payload.amount,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.giftCardAmounts.push(amount);
      console.log('[MSW] Montant ajouté:', amount, 'Total:', db.giftCardAmounts.length);
      return ok(amount, 'Montant créé avec succès');
    } catch (error) {
      console.error('[MSW] Erreur lors de la création du montant:', error);
      return failure('Erreur lors de la création du montant', 500);
    }
  }),
  http.delete(`${API_URL}/gift-cards/amounts/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const index = db.giftCardAmounts.findIndex((a) => a.id === id);
    if (index === -1) return failure('Montant introuvable', 404);
    db.giftCardAmounts.splice(index, 1);
    return ok(null, 'Montant supprimé avec succès');
  }),
  // ============================================================================
  // HANDLERS - CARTES UP LIBRES
  // ============================================================================
  http.get(`${API_URL}/gift-cards/cartes-up-libres`, async () => ok(db.cartesUpLibres, 'Cartes Up libres récupérées avec succès')),
  http.get(`${API_URL}/gift-cards/cartes-up-libres/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const carte = db.cartesUpLibres.find((c) => c.id === id);
    if (!carte) return failure('Carte Up libre introuvable', 404);
    return ok(carte, 'Carte Up libre récupérée avec succès');
  }),
  http.post(`${API_URL}/gift-cards/cartes-up-libres`, async ({ request }) => {
    const contentType = request.headers.get('content-type');
    let payload: Partial<CarteUpLibre>;
    let imageUrl: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const montantsDisponibles = JSON.parse((formData.get('montantsDisponibles') as string) || '[]');
      const partenairesEligibles = JSON.parse((formData.get('partenairesEligibles') as string) || '[]');
      const imageFile = formData.get('image') as File | null;
      
      if (imageFile && imageFile.size > 0) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
          imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent((formData.get('nom') as string) || 'Carte')}`;
        }
      }

      payload = {
        nom: formData.get('nom') as string,
        description: formData.get('description') as string,
        montantsDisponibles,
        partenairesEligibles,
        conditions: (formData.get('conditions') as string) || undefined,
        commentCaMarche: (formData.get('commentCaMarche') as string) || undefined,
        status: (formData.get('status') as 'active' | 'inactive') || 'active',
      };
    } else {
      payload = (await request.json()) as Partial<CarteUpLibre>;
    }

    const carte: CarteUpLibre = {
      id: makeId(),
      nom: payload.nom!,
      description: payload.description!,
      imageUrl,
      montantsDisponibles: payload.montantsDisponibles || [],
      partenairesEligibles: payload.partenairesEligibles || [],
      conditions: payload.conditions,
      commentCaMarche: payload.commentCaMarche,
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.cartesUpLibres.push(carte);
    return ok(carte, 'Carte Up libre créée avec succès');
  }),
  http.patch(`${API_URL}/gift-cards/cartes-up-libres/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const carte = db.cartesUpLibres.find((c) => c.id === id);
    if (!carte) return failure('Carte Up libre introuvable', 404);

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      if (formData.get('nom')) carte.nom = formData.get('nom') as string;
      if (formData.get('description')) carte.description = formData.get('description') as string;
      if (formData.get('montantsDisponibles')) {
        carte.montantsDisponibles = JSON.parse(formData.get('montantsDisponibles') as string);
      }
      if (formData.get('partenairesEligibles')) {
        carte.partenairesEligibles = JSON.parse(formData.get('partenairesEligibles') as string);
      }
      if (formData.has('conditions')) carte.conditions = (formData.get('conditions') as string) || undefined;
      if (formData.has('commentCaMarche')) carte.commentCaMarche = (formData.get('commentCaMarche') as string) || undefined;
      if (formData.get('status')) carte.status = formData.get('status') as 'active' | 'inactive';

      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          carte.imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
        }
      }
    } else {
      const payload = (await request.json()) as Partial<CarteUpLibre>;
      Object.assign(carte, payload);
    }
    carte.updatedAt = new Date().toISOString();
    return ok(carte, 'Carte Up libre mise à jour avec succès');
  }),
  http.delete(`${API_URL}/gift-cards/cartes-up-libres/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const index = db.cartesUpLibres.findIndex((c) => c.id === id);
    if (index === -1) return failure('Carte Up libre introuvable', 404);
    db.cartesUpLibres.splice(index, 1);
    return ok(null, 'Carte Up libre supprimée avec succès');
  }),
  // ============================================================================
  // HANDLERS - CARTES UP PRÉ-DÉFINIES
  // ============================================================================
  http.get(`${API_URL}/gift-cards/cartes-up-predefinies`, async () => ok(db.cartesUpPredefinies, 'Cartes Up pré-définies récupérées avec succès')),
  http.get(`${API_URL}/gift-cards/cartes-up-predefinies/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const carte = db.cartesUpPredefinies.find((c) => c.id === id);
    if (!carte) return failure('Carte Up pré-définie introuvable', 404);
    return ok(carte, 'Carte Up pré-définie récupérée avec succès');
  }),
  http.post(`${API_URL}/gift-cards/cartes-up-predefinies`, async ({ request }) => {
    const contentType = request.headers.get('content-type');
    let payload: Partial<CarteUpPredefinie>;
    let imageUrl: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const imageFile = formData.get('image') as File | null;
      
      if (imageFile && imageFile.size > 0) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
          imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent((formData.get('nom') as string) || 'Carte')}`;
        }
      }

      const partenaireId = formData.get('partenaireId') as string;
      const partner = db.partners.find((p) => p.id === partenaireId);

      payload = {
        nom: formData.get('nom') as string,
        partenaireId,
        partenaireName: partner?.name,
        offre: formData.get('offre') as string,
        montant: parseFloat(formData.get('montant') as string),
        description: formData.get('description') as string,
        conditions: (formData.get('conditions') as string) || undefined,
        commentCaMarche: (formData.get('commentCaMarche') as string) || undefined,
        status: (formData.get('status') as 'active' | 'inactive') || 'active',
      };
    } else {
      payload = (await request.json()) as Partial<CarteUpPredefinie>;
    }

    const carte: CarteUpPredefinie = {
      id: makeId(),
      nom: payload.nom!,
      partenaireId: payload.partenaireId!,
      partenaireName: payload.partenaireName,
      offre: payload.offre!,
      montant: payload.montant!,
      imageUrl,
      description: payload.description!,
      conditions: payload.conditions,
      commentCaMarche: payload.commentCaMarche,
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.cartesUpPredefinies.push(carte);
    return ok(carte, 'Carte Up pré-définie créée avec succès');
  }),
  http.patch(`${API_URL}/gift-cards/cartes-up-predefinies/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const carte = db.cartesUpPredefinies.find((c) => c.id === id);
    if (!carte) return failure('Carte Up pré-définie introuvable', 404);

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      if (formData.get('nom')) carte.nom = formData.get('nom') as string;
      if (formData.get('partenaireId')) {
        carte.partenaireId = formData.get('partenaireId') as string;
        const partner = db.partners.find((p) => p.id === carte.partenaireId);
        carte.partenaireName = partner?.name;
      }
      if (formData.get('offre')) carte.offre = formData.get('offre') as string;
      if (formData.get('montant')) carte.montant = parseFloat(formData.get('montant') as string);
      if (formData.get('description')) carte.description = formData.get('description') as string;
      if (formData.has('conditions')) carte.conditions = (formData.get('conditions') as string) || undefined;
      if (formData.has('commentCaMarche')) carte.commentCaMarche = (formData.get('commentCaMarche') as string) || undefined;
      if (formData.get('status')) carte.status = formData.get('status') as 'active' | 'inactive';

      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          carte.imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
        }
      }
    } else {
      const payload = (await request.json()) as Partial<CarteUpPredefinie>;
      if (payload.partenaireId) {
        const partner = db.partners.find((p) => p.id === payload.partenaireId);
        payload.partenaireName = partner?.name;
      }
      Object.assign(carte, payload);
    }
    carte.updatedAt = new Date().toISOString();
    return ok(carte, 'Carte Up pré-définie mise à jour avec succès');
  }),
  http.delete(`${API_URL}/gift-cards/cartes-up-predefinies/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const index = db.cartesUpPredefinies.findIndex((c) => c.id === id);
    if (index === -1) return failure('Carte Up pré-définie introuvable', 404);
    db.cartesUpPredefinies.splice(index, 1);
    return ok(null, 'Carte Up pré-définie supprimée avec succès');
  }),
  // ============================================================================
  // HANDLERS - BOX UP
  // ============================================================================
  http.get(`${API_URL}/gift-cards/box-ups`, async () => ok(db.boxUps, 'Box Ups récupérées avec succès')),
  http.get(`${API_URL}/gift-cards/box-ups/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const box = db.boxUps.find((b) => b.id === id);
    if (!box) return failure('Box Up introuvable', 404);
    return ok(box, 'Box Up récupérée avec succès');
  }),
  http.post(`${API_URL}/gift-cards/box-ups`, async ({ request }) => {
    const contentType = request.headers.get('content-type');
    let payload: Partial<BoxUp>;
    let imageUrl: string | undefined;

    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const partenaires = JSON.parse((formData.get('partenaires') as string) || '[]');
      
      // Enrichir les partenaires avec les noms
      const enrichedPartners = partenaires.map((p: any) => {
        const partner = db.partners.find((part) => part.id === p.partenaireId);
        return {
          ...p,
          partenaireName: partner?.name,
        };
      });

      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
          imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent((formData.get('nom') as string) || 'Box')}`;
        }
      }

      payload = {
        nom: formData.get('nom') as string,
        description: formData.get('description') as string,
        partenaires: enrichedPartners,
        commentCaMarche: (formData.get('commentCaMarche') as string) || undefined,
        status: (formData.get('status') as 'active' | 'inactive') || 'active',
      };
    } else {
      payload = (await request.json()) as Partial<BoxUp>;
    }

    const box: BoxUp = {
      id: makeId(),
      nom: payload.nom!,
      description: payload.description!,
      imageUrl,
      partenaires: payload.partenaires || [],
      commentCaMarche: payload.commentCaMarche,
      status: payload.status || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.boxUps.push(box);
    return ok(box, 'Box Up créée avec succès');
  }),
  http.patch(`${API_URL}/gift-cards/box-ups/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const box = db.boxUps.find((b) => b.id === id);
    if (!box) return failure('Box Up introuvable', 404);

    const contentType = request.headers.get('content-type');
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      if (formData.get('nom')) box.nom = formData.get('nom') as string;
      if (formData.get('description')) box.description = formData.get('description') as string;
      if (formData.get('partenaires')) {
        const partenaires = JSON.parse(formData.get('partenaires') as string);
        box.partenaires = partenaires.map((p: any) => {
          const partner = db.partners.find((part) => part.id === p.partenaireId);
          return {
            ...p,
            partenaireName: partner?.name,
          };
        });
      }
      if (formData.has('commentCaMarche')) box.commentCaMarche = (formData.get('commentCaMarche') as string) || undefined;
      if (formData.get('status')) box.status = formData.get('status') as 'active' | 'inactive';

      const imageFile = formData.get('image') as File | null;
      if (imageFile && imageFile.size > 0) {
        try {
          const arrayBuffer = await imageFile.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
          }
          const base64 = btoa(binary);
          const mimeType = imageFile.type || 'image/jpeg';
          box.imageUrl = `data:${mimeType};base64,${base64}`;
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
        }
      }
    } else {
      const payload = (await request.json()) as Partial<BoxUp>;
      if (payload.partenaires) {
        payload.partenaires = payload.partenaires.map((p) => {
          const partner = db.partners.find((part) => part.id === p.partenaireId);
          return {
            ...p,
            partenaireName: partner?.name,
          };
        });
      }
      Object.assign(box, payload);
    }
    box.updatedAt = new Date().toISOString();
    return ok(box, 'Box Up mise à jour avec succès');
  }),
  http.delete(`${API_URL}/gift-cards/box-ups/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const index = db.boxUps.findIndex((b) => b.id === id);
    if (index === -1) return failure('Box Up introuvable', 404);
    db.boxUps.splice(index, 1);
    return ok(null, 'Box Up supprimée avec succès');
  }),
  // ============================================================================
  // HANDLERS - ENVOI DE CADEAUX
  // ============================================================================
  http.post(`${API_URL}/gifts/send-email`, async ({ request }) => {
    const payload = (await request.json()) as GiftSendInput;
    const log: GiftSendLog = {
      id: makeId(),
      cadeauId: payload.cadeauId,
      cadeauNom: payload.type === 'carte-up-libre' 
        ? db.cartesUpLibres.find((c) => c.id === payload.cadeauId)?.nom || 'Carte Up libre'
        : payload.type === 'carte-up-predefinie'
        ? db.cartesUpPredefinies.find((c) => c.id === payload.cadeauId)?.nom || 'Carte Up pré-définie'
        : db.boxUps.find((b) => b.id === payload.cadeauId)?.nom || 'Box Up',
      type: payload.type,
      destinataireEmail: payload.destinataireEmail,
      statut: 'envoye',
      dateEnvoi: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.giftSendLogs.unshift(log);
    return ok(log, 'Cadeau envoyé par email avec succès');
  }),
  http.post(`${API_URL}/gifts/send-in-app`, async ({ request }) => {
    const payload = (await request.json()) as GiftSendInput;
    const log: GiftSendLog = {
      id: makeId(),
      cadeauId: payload.cadeauId,
      cadeauNom: payload.type === 'carte-up-libre' 
        ? db.cartesUpLibres.find((c) => c.id === payload.cadeauId)?.nom || 'Carte Up libre'
        : payload.type === 'carte-up-predefinie'
        ? db.cartesUpPredefinies.find((c) => c.id === payload.cadeauId)?.nom || 'Carte Up pré-définie'
        : db.boxUps.find((b) => b.id === payload.cadeauId)?.nom || 'Box Up',
      type: payload.type,
      destinataireUserId: payload.destinataireUserId,
      statut: 'envoye',
      dateEnvoi: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    db.giftSendLogs.unshift(log);
    return ok(log, 'Cadeau envoyé en notification push avec succès');
  }),
  http.get(`${API_URL}/gifts/logs`, async () => ok(db.giftSendLogs, 'Logs d\'envoi de cadeaux récupérés avec succès')),
  http.get(`${API_URL}/donations`, async () => ok(db.donations, 'Dons récupérés avec succès')),
  http.post(`${API_URL}/donations`, async ({ request }) => {
    const payload = (await request.json()) as DonationFormInput;
    const donation = { id: makeId(), ...payload };
    db.donations.unshift(donation);
    return ok(donation, 'Don créé avec succès');
  }),
  // ============================================================================
  // HANDLERS - ASSOCIATIONS
  // ============================================================================
  http.get(`${API_URL}/donations/associations`, async () => ok(db.associations, 'Associations récupérées avec succès')),
  http.get(`${API_URL}/donations/associations/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const association = db.associations.find((a) => a.id === id);
    if (!association) return failure('Association introuvable', 404);
    return ok(association, 'Association récupérée avec succès');
  }),
  http.post(`${API_URL}/donations/associations`, async ({ request }) => {
    try {
      const contentType = request.headers.get('content-type');
      let payload: Partial<AssociationFormInput>;
      let imageUrl: string | undefined;
      
      // Log pour déboguer
      if (import.meta.env.DEV) {
        console.log('[MSW] POST /donations/associations - Content-Type:', contentType);
      }
      
      // Essayer de parser comme FormData d'abord (même si le Content-Type n'est pas défini)
      let formData: FormData | null = null;
      try {
        // Cloner la requête pour pouvoir la lire plusieurs fois si nécessaire
        const clonedRequest = request.clone();
        formData = await clonedRequest.formData();
      } catch {
        // Si ça échoue, ce n'est probablement pas un FormData
      }
      
      // Si on a réussi à parser comme FormData, utiliser FormData
      if (formData) {
        const imageFile = formData.get('image') as File | null;
        
        if (imageFile && imageFile.size > 0) {
          try {
            imageUrl = await convertFileToDataUrl(imageFile);
          } catch (error) {
            console.error('Erreur lors de la conversion de l\'image:', error);
            imageUrl = `https://via.placeholder.com/400x300?text=${encodeURIComponent((formData.get('nom') as string) || 'Association')}`;
          }
        }
        
        payload = {
          nom: formData.get('nom') as string,
          type: (formData.get('type') as AssociationFormInput['type']) || 'solidaire',
          but: formData.get('but') as string,
          tonImpact: formData.get('tonImpact') as string,
          status: (formData.get('status') as 'draft' | 'active') || 'draft',
        };
      } else {
        // Essayer de parser comme JSON
        try {
          payload = (await request.json()) as AssociationFormInput;
        } catch {
          // Si ça échoue aussi, essayer de lire le texte
          const text = await request.text();
          payload = JSON.parse(text) as AssociationFormInput;
        }
      }
      
      if (import.meta.env.DEV) {
        console.log('[MSW] Payload parsé:', payload);
      }
      
      // Valider que le payload contient les champs requis
      if (!payload.nom || !payload.type || !payload.but || !payload.tonImpact) {
        return failure('Les champs nom, type, but et tonImpact sont obligatoires', 400);
      }
      
      const association: Association = {
        id: makeId(),
        nom: payload.nom,
        type: payload.type,
        but: payload.but,
        tonImpact: payload.tonImpact,
        imageUrl,
        status: payload.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.associations.unshift(association);
      return ok(association, 'Association créée avec succès');
    } catch (error) {
      console.error('[MSW] Erreur lors de la création de l\'association:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return failure(`Erreur lors de la création de l'association: ${errorMessage}`, 400);
    }
  }),
  http.patch(`${API_URL}/donations/associations/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const association = db.associations.find((a) => a.id === id);
    if (!association) return failure('Association introuvable', 404);
    
    // Essayer de parser comme FormData d'abord
    let formData: FormData | null = null;
    try {
      const clonedRequest = request.clone();
      formData = await clonedRequest.formData();
    } catch {
      // Si ça échoue, ce n'est probablement pas un FormData
    }
    
    if (formData) {
      const imageFile = formData.get('image') as File | null;
      
      if (imageFile && imageFile.size > 0) {
        try {
          association.imageUrl = await convertFileToDataUrl(imageFile);
        } catch (error) {
          console.error('Erreur lors de la conversion de l\'image:', error);
        }
      }
      
      if (formData.get('nom')) association.nom = formData.get('nom') as string;
      if (formData.get('type')) association.type = formData.get('type') as Association['type'];
      if (formData.get('but')) association.but = formData.get('but') as string;
      if (formData.get('tonImpact')) association.tonImpact = formData.get('tonImpact') as string;
      if (formData.get('status')) association.status = formData.get('status') as 'draft' | 'active';
    } else {
      // Essayer de parser comme JSON
      try {
        const payload = (await request.json()) as Partial<AssociationFormInput>;
        if (payload.nom) association.nom = payload.nom;
        if (payload.type) association.type = payload.type;
        if (payload.but) association.but = payload.but;
        if (payload.tonImpact) association.tonImpact = payload.tonImpact;
        if (payload.status) association.status = payload.status;
      } catch {
        // Si ça échoue, essayer de lire le texte
        const text = await request.text();
        const payload = JSON.parse(text) as Partial<AssociationFormInput>;
        if (payload.nom) association.nom = payload.nom;
        if (payload.type) association.type = payload.type;
        if (payload.but) association.but = payload.but;
        if (payload.tonImpact) association.tonImpact = payload.tonImpact;
        if (payload.status) association.status = payload.status;
      }
    }
    
    association.updatedAt = new Date().toISOString();
    return ok(association, 'Association mise à jour avec succès');
  }),
  http.delete(`${API_URL}/donations/associations/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const index = db.associations.findIndex((a) => a.id === id);
    if (index === -1) return failure('Association introuvable', 404);
    db.associations.splice(index, 1);
    return ok(null, 'Association supprimée avec succès');
  }),
  // ============================================================================
  // HANDLERS - PROJETS
  // ============================================================================
  http.get(`${API_URL}/donations/projets`, async () => ok(db.projets, 'Projets récupérés avec succès')),
  http.get(`${API_URL}/donations/projets/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const projet = db.projets.find((p) => p.id === id);
    if (!projet) return failure('Projet introuvable', 404);
    return ok(projet, 'Projet récupéré avec succès');
  }),
  http.post(`${API_URL}/donations/projets`, async ({ request }) => {
    try {
      let payload: ProjetFormInput;
      
      // Essayer de parser comme JSON
      try {
        payload = (await request.json()) as ProjetFormInput;
      } catch {
        // Si ça échoue, essayer de lire le texte
        try {
          const text = await request.text();
          payload = JSON.parse(text) as ProjetFormInput;
        } catch (parseError) {
          console.error('[MSW] Erreur lors du parsing du projet:', parseError);
          return failure('Impossible de parser les données du projet', 400);
        }
      }
      
      // Valider que le payload contient les champs requis
      if (!payload.nom || !payload.descriptif || !payload.tonImpact) {
        return failure('Les champs nom, descriptif et tonImpact sont obligatoires', 400);
      }
      
      const projet: Projet = {
        id: makeId(),
        nom: payload.nom,
        descriptif: payload.descriptif,
        tonImpact: payload.tonImpact,
        status: payload.status || 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      db.projets.unshift(projet);
      return ok(projet, 'Projet créé avec succès');
    } catch (error) {
      console.error('[MSW] Erreur lors de la création du projet:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return failure(`Erreur lors de la création du projet: ${errorMessage}`, 400);
    }
  }),
  http.patch(`${API_URL}/donations/projets/:id`, async ({ params, request }) => {
    const { id } = params as { id: string };
    const projet = db.projets.find((p) => p.id === id);
    if (!projet) return failure('Projet introuvable', 404);
    
    let payload: Partial<ProjetFormInput>;
    try {
      payload = (await request.json()) as Partial<ProjetFormInput>;
    } catch {
      // Si ça échoue, essayer de lire le texte
      try {
        const text = await request.text();
        payload = JSON.parse(text) as Partial<ProjetFormInput>;
      } catch (parseError) {
        console.error('[MSW] Erreur lors du parsing du projet:', parseError);
        return failure('Impossible de parser les données du projet', 400);
      }
    }
    
    if (payload.nom) projet.nom = payload.nom;
    if (payload.descriptif) projet.descriptif = payload.descriptif;
    if (payload.tonImpact) projet.tonImpact = payload.tonImpact;
    if (payload.status) projet.status = payload.status;
    projet.updatedAt = new Date().toISOString();
    return ok(projet, 'Projet mis à jour avec succès');
  }),
  http.delete(`${API_URL}/donations/projets/:id`, async ({ params }) => {
    const { id } = params as { id: string };
    const index = db.projets.findIndex((p) => p.id === id);
    if (index === -1) return failure('Projet introuvable', 404);
    db.projets.splice(index, 1);
    return ok(null, 'Projet supprimé avec succès');
  }),
  http.get(`${API_URL}/content`, async () => ok(db.contentItems, 'Contenus récupérés avec succès')),
  http.post(`${API_URL}/content`, async ({ request }) => {
    const payload = (await request.json()) as ContentFormInput;
    const item: ContentItem = {
      id: makeId(),
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    db.contentItems.unshift(item);
    return ok(item, 'Contenu créé avec succès');
  }),
  http.get(`${API_URL}/me/notifications/templates`, async () => ok(db.notificationTemplates, 'Modèles de notifications récupérés avec succès')),
  http.post(`${API_URL}/me/notifications`, async ({ request }) => {
    const payload = (await request.json()) as NotificationFormInput;
    db.auditLogs.unshift({
      id: makeId(),
      actor: db.adminUser.fullName,
      action: `Notification ${payload.templateId} -> ${payload.audience}`,
      createdAt: new Date().toISOString(),
      metadata: payload.segment ?? 'segment=all',
    });
    return ok(null, 'Notification envoyée avec succès');
  }),
  http.get(`${API_URL}/powens/overview`, async () => ok(db.powensOverview, 'Vue d\'ensemble Powens récupérée avec succès')),
  http.get(`${API_URL}/powens/webhooks`, async () => ok(db.powensWebhooks, 'Webhooks Powens récupérés avec succès')),
  http.post(`${API_URL}/powens/links/:linkId/refresh`, async ({ params }) => {
    const { linkId } = params as { linkId: string };
    const link = db.powensOverview.links.find((item) => item.id === linkId);
    if (!link) return failure('Lien introuvable', 404);
    link.updatedAt = new Date().toISOString();
    link.status = 'syncing';
    return ok(null, 'Lien Powens rafraîchi avec succès');
  }),
  http.post(`${API_URL}/powens/webhook`, async () => {
    const event: PowensWebhook = {
      id: makeId(),
      event: 'manual.trigger',
      status: 'success',
      receivedAt: new Date().toISOString(),
    };
    db.powensWebhooks.unshift(event);
    db.webhookEvents.unshift({
      id: makeId(),
      source: 'powens',
      status: 'success',
      payloadPreview: 'manual.trigger',
      receivedAt: event.receivedAt,
    });
    return ok(null, 'Webhook Powens traité avec succès');
  }),
  http.get(`${API_URL}/drimify/experiences`, async () => ok(db.drimifyExperiences, 'Expériences Drimify récupérées avec succès')),
  http.post(`${API_URL}/drimify/experiences/:experienceId/play`, async ({ params }) => {
    const { experienceId } = params as { experienceId: string };
    const experience = db.drimifyExperiences.find((item) => item.id === experienceId);
    if (!experience) return failure('Expérience introuvable', 404);
    experience.participants += 1;
    return ok(experience, 'Expérience jouée avec succès');
  }),
  http.post(`${API_URL}/drimify/webhook`, async () => {
    db.webhookEvents.unshift({
      id: makeId(),
      source: 'drimify',
      status: 'success',
      payloadPreview: 'webhook.simulated',
      receivedAt: new Date().toISOString(),
    });
    return ok(null, 'Webhook Drimify traité avec succès');
  }),
  http.get(`${API_URL}/transactions`, async ({ request }) => {
    const url = new URL(request.url);
    const filters: TransactionsFilters = {
      source: (url.searchParams.get('source') as TransactionsFilters['source']) ?? 'all',
      status: (url.searchParams.get('status') as TransactionsFilters['status']) ?? 'all',
      partnerId: url.searchParams.get('partnerId') ?? undefined,
    };
    return ok(filterTransactions(filters), 'Transactions récupérées avec succès');
  }),
  http.post(`${API_URL}/transactions`, async ({ request }) => {
    const payload = await request.json() as Partial<ManualTransactionInput & { userId?: string; amount?: number; partnerId?: string; source?: string; type?: string }>;
    const isWalletAdjustment = payload.type === 'credit' || payload.type === 'debit';
    const direction = isWalletAdjustment && payload.type === 'debit' ? -1 : 1;
    const userId = payload.userId ?? db.users[0].id;
    const amount = Number(payload.amount ?? 0);
    const transactionType: ManualTransactionInput['type'] =
      !isWalletAdjustment && payload.type ? payload.type as ManualTransactionInput['type'] : payload.source === 'points' ? 'points' : 'cashback';

    const transaction = {
      id: makeId(),
      userId,
      partnerId: payload.partnerId,
      type: transactionType,
      status: 'settled' as const,
      amount,
      createdAt: new Date().toISOString(),
    };
    db.transactions.unshift(transaction);
    const user = db.users.find((candidate) => candidate.id === userId);
    if (user && isWalletAdjustment) {
      if (payload.source === 'cashback') {
        user.wallet.balanceCashback = Math.max(0, user.wallet.balanceCashback + direction * amount);
      } else if (payload.source === 'points') {
        user.wallet.balancePoints = Math.max(0, user.wallet.balancePoints + direction * amount);
      }
      user.wallet.updatedAt = new Date().toISOString();
    }
    return ok(transaction, 'Transaction créée avec succès');
  }),
  http.get(`${API_URL}/transactions/export`, async () =>
    new HttpResponse('id,type,amount\n1,cashback,12', { headers: { 'Content-Type': 'text/csv' } }),
  ),
  http.post(`${API_URL}/transactions/:transactionId/flag`, async ({ params }) => {
    const { transactionId } = params as { transactionId: string };
    const transaction = db.transactions.find((item) => item.id === transactionId);
    if (!transaction) return failure('Transaction introuvable', 404);
    transaction.status = 'flagged';
    return ok(transaction, 'Transaction signalée avec succès');
  }),
  http.get(`${API_URL}/webhooks`, async ({ request }) => {
    const url = new URL(request.url);
    const source = url.searchParams.get('source');
    const events = source ? db.webhookEvents.filter((event) => event.source === source) : db.webhookEvents;
    const sources = Array.from(new Set(db.webhookEvents.map((event) => event.source)));
    return ok({ events, sources }, 'Webhooks récupérés avec succès');
  }),
  http.post(`${API_URL}/webhooks`, async ({ request }) => {
    const payload = (await request.json()) as WebhookTestInput;
    const event = {
      id: makeId(),
      source: payload.source,
      status: payload.status ?? 'success',
      payloadPreview: payload.payloadPreview ?? 'Test payload',
      receivedAt: new Date().toISOString(),
    };
    db.webhookEvents.unshift(event);
    return ok(event, 'Webhook testé avec succès');
  }),
  http.get(`${API_URL}/monitoring/health`, async () => ok(db.monitoringHealth, 'État de santé récupéré avec succès')),
  http.get(`${API_URL}/monitoring/metrics`, async () => ok(db.monitoringMetrics, 'Métriques récupérées avec succès')),
  http.get(`${API_URL}/admin/settings/roles`, async () => ok(db.roles)),
  http.post(`${API_URL}/admin/settings/roles`, async ({ request }) => {
    const payload = (await request.json()) as RoleFormInput;
    const entry = {
      id: makeId(),
      fullName: payload.email.split('@')[0],
      email: payload.email,
      role: payload.role,
      lastLoginAt: undefined,
    };
    db.roles.push(entry);
    return ok(entry, 'Rôle créé avec succès');
  }),
  http.patch(`${API_URL}/admin/settings/roles/:roleId`, async ({ params, request }) => {
    const { roleId } = params as { roleId: string };
    const payload = (await request.json()) as Partial<RoleFormInput>;
    const entry = db.roles.find((item) => item.id === roleId);
    if (!entry) return failure('Rôle introuvable', 404);
    Object.assign(entry, payload);
    return ok(entry, 'Rôle mis à jour avec succès');
  }),
  http.get(`${API_URL}/admin/settings/globals`, async () => ok(db.globalObjectives, 'Objectifs globaux récupérés avec succès')),
  http.patch(`${API_URL}/admin/settings/globals`, async ({ request }) => {
    const payload = await request.json();
    Object.assign(db.globalObjectives, payload);
    return ok(db.globalObjectives, 'Objectifs globaux mis à jour avec succès');
  }),
  http.get(`${API_URL}/admin/settings/audit-log`, async () => ok(db.auditLogs, 'Journal d\'audit récupéré avec succès')),
];


