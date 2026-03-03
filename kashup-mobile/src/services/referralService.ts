import apiClient from './apiClient';

export type ReferralSummary = {
  totalEarnedPoints: number;
  totalBoostsUnlocked: number;
  sponsorRewardPoints: number;
  inviteeRewardBoost: number;
  activationDelayHours: number;
};

export type ReferralInvitee = {
  id: string;
  firstName: string;
  lastName: string;
  status: 'invited' | 'registered' | 'cashbacked';
  rewardPoints: number;
  rewardBoosts: number;
};

export const getReferralSummary = async (): Promise<ReferralSummary> => {
  const { data } = await apiClient.get<ReferralSummary>('/me/referrals/summary');
  return data;
};

export const getReferralInvitees = async (): Promise<ReferralInvitee[]> => {
  const { data } = await apiClient.get<ReferralInvitee[]>('/me/referrals/invitees');
  return data;
};


