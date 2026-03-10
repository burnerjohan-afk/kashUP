/**
 * Service Loteries - utilise /api/v1/rewards/lotteries et /lotteries
 */

import apiClient from './apiClient';

export type Lottery = {
  id: string;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  imageUrl?: string | null;
  prizeType?: string | null;
  prizeTitle?: string | null;
  prizeDescription?: string | null;
  prizeValue?: number | null;
  prizeCurrency?: string | null;
  partnerId?: string | null;
  partner?: { id: string; name: string; logoUrl: string | null } | null;
  pointsPerTicket: number;
  isTicketStockLimited?: boolean;
  totalTicketsAvailable?: number | null;
  totalTicketsSold?: number;
  ticketsRemaining?: number | null;
  maxTicketsPerUser?: number | null;
  startAt: string;
  endAt: string;
  drawDate?: string;
  status: string;
  showOnHome?: boolean;
  showOnRewards?: boolean;
  userTicketCount?: number;
  userPointsSpent?: number;
  countdown?: { text: string; imminent?: boolean; days?: number; hours?: number; minutes?: number; seconds?: number };
};

export async function listLotteries(): Promise<Lottery[]> {
  const { data } = await apiClient.get<Lottery[]>('/rewards/lotteries');
  return Array.isArray(data) ? data : [];
}

export async function listLotteriesForHome(): Promise<Lottery[]> {
  const { data } = await apiClient.get<Lottery[]>('/rewards/lotteries/home');
  return Array.isArray(data) ? data : [];
}

export async function getLottery(id: string): Promise<Lottery> {
  const { data } = await apiClient.get<Lottery>(`/rewards/lotteries/${id}`);
  if (!data) throw new Error('Loterie introuvable');
  return data;
}

export type JoinLotteryResult = Lottery;

export async function joinLottery(lotteryId: string, ticketCount: number): Promise<JoinLotteryResult> {
  const { data } = await apiClient.post<JoinLotteryResult>(`/rewards/lotteries/${lotteryId}/join`, {
    tickets: ticketCount,
  });
  if (!data) throw new Error('Erreur lors de la participation');
  return data;
}
