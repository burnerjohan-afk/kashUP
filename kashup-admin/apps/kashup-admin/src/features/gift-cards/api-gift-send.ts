import { getStandardJson, postStandardJson } from '@/lib/api/client';
import { unwrapStandardResponse } from '@/lib/api/response';
import type { GiftSendLog, GiftSendInput } from '@/types/gifts';

// ============================================================================
// API - ENVOI DE CADEAUX
// ============================================================================

export const sendGiftByEmail = async (payload: GiftSendInput): Promise<GiftSendLog> => {
  const response = await postStandardJson<GiftSendLog>('gifts/send-email', payload);
  return unwrapStandardResponse(response);
};

export const sendGiftInApp = async (payload: GiftSendInput): Promise<GiftSendLog> => {
  const response = await postStandardJson<GiftSendLog>('gifts/send-in-app', payload);
  return unwrapStandardResponse(response);
};

export const fetchGiftSendLogs = async (): Promise<GiftSendLog[]> => {
  const response = await getStandardJson<GiftSendLog[]>('gifts/logs');
  return unwrapStandardResponse(response);
};

