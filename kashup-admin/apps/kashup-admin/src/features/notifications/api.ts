import { z } from 'zod';
import { getJson, postJson } from '@/lib/api/client';
import { unwrapResponse } from '@/lib/api/response';
import type { NotificationTemplate } from '@/types/entities';

export const fetchNotificationTemplates = async () => {
  const response = await getJson<NotificationTemplate[]>('me/notifications/templates');
  return unwrapResponse(response);
};

export const notificationFormSchema = z.object({
  templateId: z.string().min(1),
  audience: z.enum(['all', 'active', 'dormant', 'kyc_pending']),
  segment: z.string().optional(),
  sendAt: z.string().optional(),
});

export type NotificationFormInput = z.infer<typeof notificationFormSchema>;

export const sendNotification = async (payload: NotificationFormInput) => {
  const response = await postJson<null>('me/notifications', payload);
  return unwrapResponse(response);
};

