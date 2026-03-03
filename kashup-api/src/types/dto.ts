/**
 * DTOs (Data Transfer Objects) pour les réponses API
 */

import { TERRITORIES } from './domain';

// DTO pour les statistiques de table
export interface StatisticsTableRowDTO {
  territory: string;
  ageRange: string;
  gender: 'M' | 'F' | 'other';
  timeSlot: string | null;
  allDay: boolean;
  count: number;
  transactions: number;
  revenue: number;
  cashback: number;
  averageTransaction: number;
}

export interface StatisticsTableDTO {
  rows: StatisticsTableRowDTO[];
  totals: {
    count: number;
    transactions: number;
    revenue: number;
    cashback: number;
    averageTransaction: number;
  };
  filters: {
    territory: string | null;
    allDay: boolean;
    timeSlot: string | null;
    gender: 'M' | 'F' | 'other' | null;
    ageRange: string | null;
  };
}

// DTO pour les statistiques par département
export interface DepartmentStatisticsDTO {
  department: string;
  code: string;
  territory: string;
  partners: number;
  transactions: number;
  revenue: number;
  averageTransaction: number;
  cashback: number;
}

// DTO pour l'analyse IA
export interface AIAnalysisKPIsDTO {
  revenue: number;
  cashback: number;
  partners: number;
  users: number;
}

export interface DailyTransactionDTO {
  date: string; // Format YYYY-MM-DD
  count: number;
  revenue: number;
  cashback: number;
}

export interface TerritoryStatsDTO {
  territory: string;
  users: number;
  partners: number;
  transactions: number;
  revenue: number;
  cashback: number;
  growth: number; // Pourcentage
}

export interface AIAnalysisDTO {
  kpis: AIAnalysisKPIsDTO;
  services: number;
  dailyTransactions: DailyTransactionDTO[];
  territories: TerritoryStatsDTO[];
  actions: number;
}

// DTO pour les partenaires (compatible mobile)
export interface PartnerDTO {
  id: string;
  name: string;
  slug: string;
  siret: string | null;
  phone: string | null;
  category: {
    id: string;
    name: string;
  } | null;
  territories: string[]; // Array de territoires
  logoUrl: string | null;
  description: string | null;
  shortDescription: string | null;
  websiteUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  tauxCashbackBase: number;
  latitude: number | null;
  longitude: number | null;
  boostable: boolean;
  menuImages: string[];
  photos: string[];
  marketingPrograms: string[];
  createdAt: string | null;
  updatedAt: string | null;
}

// DTO pour la pagination
export interface PaginationDTO {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// DTO pour les réponses paginées
export interface PaginatedResponseDTO<T> {
  data: T[];
  pagination: PaginationDTO;
}

