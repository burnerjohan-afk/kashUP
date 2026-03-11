import { getJson, postJson } from '@/lib/api/client';
import { unwrapResponse } from '@/lib/api/response';
import type { DrimifyExperience } from '@/types/entities';

export const fetchDrimifyExperiences = async () => {
  const response = await getJson<DrimifyExperience[]>('drimify/experiences');
  return unwrapResponse(response);
};

export const playExperience = async (experienceId: string) => {
  const response = await postJson<DrimifyExperience>(`drimify/experiences/${experienceId}/play`);
  return unwrapResponse(response);
};

export const triggerDrimifyWebhook = async () => {
  const response = await postJson<null>('drimify/webhook');
  return unwrapResponse(response);
};

