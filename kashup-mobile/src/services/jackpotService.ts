/**
 * Service Jackpot communautaire - GET /api/v1/community-jackpot
 */

import apiClient from './apiClient';

export type JackpotProgress = {
  partnerPurchasesAmount: number;
  partnerPurchasesThreshold: number;
  actions: number;
  actionsThreshold: number;
};

export type JackpotConfig = {
  id: string;
  cashbackContributionPercent: number;
  lotteryPointsContribution: number;
  challengePointsContribution: number;
  globalPartnerPurchaseAmountThreshold: number;
  globalActionsThreshold: number;
  minActionsPerUser: number;
  minPartnerPurchasesPerUser: number | null;
  freeParticipationTickets: number;
  partnerPurchaseTickets: number;
  lotteryTicketTickets: number;
  challengeCompletionTickets: number;
  maxDrawDate: string | null;
};

export type CurrentJackpot = {
  id: string;
  title: string;
  description: string | null;
  currentAmount: number;
  currency: string;
  startDate: string;
  maxDrawDate: string | null;
  status: string;
  totalParticipants: number;
  totalActions: number;
  totalPartnerPurchasesAmount: number;
  lastWinnerUserId: string | null;
  lastWinningAmount: number | null;
  progress: JackpotProgress;
  config: JackpotConfig;
};

export type UserJackpotStats = {
  tickets: number;
  actionsCount: number;
  partnerPurchasesCount: number;
  isEligible: boolean;
  jackpot: CurrentJackpot;
};

export async function getCurrentJackpot(): Promise<CurrentJackpot | null> {
  const res = await apiClient.get<CurrentJackpot | null>('/community-jackpot');
  return res.data ?? null;
}

export async function getJackpotStats(): Promise<UserJackpotStats | null> {
  const res = await apiClient.get<UserJackpotStats | null>('/community-jackpot/stats');
  return res.data ?? null;
}

export async function participateJackpot(): Promise<UserJackpotStats | null> {
  const res = await apiClient.post<UserJackpotStats | null>('/community-jackpot/participate');
  return res.data ?? null;
}
