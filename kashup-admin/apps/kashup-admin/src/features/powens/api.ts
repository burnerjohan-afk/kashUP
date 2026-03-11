import { getJson, postJson } from '@/lib/api/client';
import { unwrapResponse } from '@/lib/api/response';
import type { PowensLink, PowensWebhook } from '@/types/entities';

export type PowensOverview = {
  linkToken: string;
  links: PowensLink[];
  alerts: {
    type: 'budget' | 'payment' | 'connection';
    message: string;
    severity: 'info' | 'warning' | 'critical';
  }[];
};

export const fetchPowensOverview = async () => {
  const response = await getJson<PowensOverview>('powens/overview');
  return unwrapResponse(response);
};

export const fetchPowensWebhooks = async () => {
  const response = await getJson<PowensWebhook[]>('powens/webhooks');
  return unwrapResponse(response);
};

export const refreshPowensLink = async (linkId: string) => {
  const response = await postJson<null>(`powens/links/${linkId}/refresh`);
  return unwrapResponse(response);
};

export const triggerPowensWebhook = async () => {
  const response = await postJson<null>('powens/webhook');
  return unwrapResponse(response);
};

