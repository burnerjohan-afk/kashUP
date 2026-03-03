import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';

// Toutes les fonctions admin retournent des données mockées simples pour le développement
// Sans dépendance à la base de données - API déliée du back-office

export const getAdminUsers = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockUsers = [
    {
      id: 'user1',
      email: 'user1@example.com',
      firstName: 'Jean',
      lastName: 'Dupont',
      role: 'user',
      territory: 'Martinique',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user2',
      email: 'user2@example.com',
      firstName: 'Marie',
      lastName: 'Martin',
      role: 'user',
      territory: 'Guadeloupe',
      createdAt: new Date().toISOString()
    }
  ];
  sendSuccess(res, mockUsers, null, 200, 'Liste des utilisateurs récupérée avec succès');
});

export const getAdminUserByIdHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockUser = {
    id: req.params.id,
    email: 'user@example.com',
    firstName: 'Jean',
    lastName: 'Dupont',
    phone: '+596 696 12 34 56',
    role: 'user',
    territory: 'Martinique',
    createdAt: new Date().toISOString(),
    wallet: {
      balance: 150.50,
      totalEarned: 500.00
    }
  };
  sendSuccess(res, mockUser, null, 200, 'Utilisateur récupéré avec succès');
});

export const getUserTransactionsHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockTransactions = [
    {
      id: 'tx1',
      amount: 50.00,
      cashbackEarned: 2.50,
      partner: { name: 'Partenaire 1' },
      createdAt: new Date().toISOString()
    },
    {
      id: 'tx2',
      amount: 75.00,
      cashbackEarned: 3.75,
      partner: { name: 'Partenaire 2' },
      createdAt: new Date().toISOString()
    }
  ];
  sendSuccess(res, mockTransactions, null, 200, 'Transactions récupérées avec succès');
});

export const getUserRewardsHistoryHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockHistory = [
    {
      id: 'reward1',
      type: 'boost',
      points: 100,
      createdAt: new Date().toISOString()
    }
  ];
  sendSuccess(res, mockHistory, null, 200, 'Historique des récompenses récupéré avec succès');
});

export const getUserGiftCardsHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockGiftCards = [
    {
      id: 'gc1',
      amount: 25.00,
      status: 'active',
      createdAt: new Date().toISOString()
    }
  ];
  sendSuccess(res, mockGiftCards, null, 200, 'Cartes cadeaux récupérées avec succès');
});

export const getUserStatisticsHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockStats = {
    totalTransactions: 25,
    totalSpent: 1250.00,
    totalCashback: 62.50,
    totalPoints: 500
  };
  sendSuccess(res, mockStats, null, 200, 'Statistiques utilisateur récupérées avec succès');
});

export const resetUserPasswordHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockResult = {
    success: true,
    message: 'Mot de passe réinitialisé avec succès',
    newPassword: 'TempPassword123!'
  };
  sendSuccess(res, mockResult, null, 200, 'Mot de passe réinitialisé avec succès');
});

export const forceUserKYCHandler = asyncHandler(async (req: Request, res: Response) => {
  // Données mockées simples
  const mockResult = {
    success: true,
    message: 'KYC forcé avec succès',
    kycStatus: 'verified'
  };
  sendSuccess(res, mockResult, null, 200, 'KYC forcé avec succès');
});
