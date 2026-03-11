import { z } from 'zod';
import { getStandardJson, patchStandardJson, postStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type { UserRole } from '@/types/auth';

export type AdminRoleEntry = {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  lastLoginAt?: string;
};

export type GlobalObjectives = {
  monthlyCashbackTarget: number;
  pointsQuota: number;
  donationsTarget: number;
  powensQuota: number;
};

export type AuditLogEntry = {
  id: string;
  actor: string;
  action: string;
  createdAt: string;
  metadata: string;
};

export const globalsFormSchema = z.object({
  monthlyCashbackTarget: z.number().positive(),
  pointsQuota: z.number().positive(),
  donationsTarget: z.number().positive(),
  powensQuota: z.number().positive(),
});

export type GlobalsFormInput = z.infer<typeof globalsFormSchema>;

export const roleFormSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'support', 'partner_manager']),
});

export type RoleFormInput = z.infer<typeof roleFormSchema>;

export const fetchAdminRoles = async () => {
  const response = await getStandardJson<AdminRoleEntry[]>('admin/settings/roles');
  return unwrapStandardResponse(response);
};

export const updateAdminRole = async (roleId: string, payload: Partial<RoleFormInput>) => {
  const response = await patchStandardJson<AdminRoleEntry>(`admin/settings/roles/${roleId}`, payload);
  return unwrapStandardResponse(response);
};

export const createAdminRole = async (payload: RoleFormInput) => {
  const response = await postStandardJson<AdminRoleEntry>('admin/settings/roles', payload);
  return unwrapStandardResponse(response);
};

export const fetchGlobalObjectives = async () => {
  const response = await getStandardJson<GlobalObjectives>('admin/settings/globals');
  return unwrapStandardResponse(response);
};

export const updateGlobalObjectives = async (payload: GlobalsFormInput) => {
  const response = await patchStandardJson<GlobalObjectives>('admin/settings/globals', payload);
  return unwrapStandardResponse(response);
};

export const fetchAuditLogs = async () => {
  const response = await getStandardJson<AuditLogEntry[]>('admin/settings/audit-log');
  return unwrapStandardResponse(response);
};

export type CoffreFortConfig = {
  lockPeriodMonths: number;
  pointsPerEuroPerMonth: number;
};

export const fetchCoffreFortConfig = async (): Promise<CoffreFortConfig> => {
  const response = await getStandardJson<CoffreFortConfig>('admin/config/coffre-fort');
  return unwrapStandardResponse(response);
};

export const updateCoffreFortConfig = async (payload: Partial<CoffreFortConfig>): Promise<CoffreFortConfig> => {
  const response = await patchStandardJson<CoffreFortConfig>('admin/config/coffre-fort', payload);
  return unwrapStandardResponse(response);
};

// ========== Config Jackpot communautaire ==========
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

export const fetchJackpotConfig = async (): Promise<JackpotConfig> => {
  const response = await getStandardJson<JackpotConfig>('admin/config/community-jackpot');
  return unwrapStandardResponse(response);
};

export const updateJackpotConfig = async (payload: Partial<JackpotConfig>): Promise<JackpotConfig> => {
  const response = await patchStandardJson<JackpotConfig>('admin/config/community-jackpot', payload);
  return unwrapStandardResponse(response);
};


