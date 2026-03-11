import { getJson, postJson } from '@/lib/api/client';
import { unwrapResponse } from '@/lib/api/response';
import type { WebhookEvent } from '@/types/entities';

export type WebhookConsoleResponse = {
  events: WebhookEvent[];
  sources: string[];
};

export type MonitoringMetric = {
  name: string;
  value: number;
  threshold: number;
  unit: string;
  history?: Array<{ timestamp: string; value: number }>;
};

export type MonitoringHealth = {
  status: 'up' | 'degraded' | 'down';
  lastHeartbeat: string;
  metrics: MonitoringMetric[];
};

export type WebhookTestInput = {
  source: string;
  status?: WebhookEvent['status'];
  payloadPreview?: string;
};

export const fetchWebhooksConsole = async (source?: string) => {
  const response = await getJson<WebhookConsoleResponse>('webhooks', source ? { source } : undefined);
  return unwrapResponse(response);
};

export const fetchMonitoringHealth = async () => {
  const response = await getJson<MonitoringHealth>('monitoring/health');
  return unwrapResponse(response);
};

export const fetchMonitoringMetrics = async () => {
  const response = await getJson<MonitoringMetric[]>('monitoring/metrics');
  return unwrapResponse(response);
};

export const sendTestWebhook = async (payload: WebhookTestInput) => {
  const response = await postJson<WebhookEvent>('webhooks', payload);
  return unwrapResponse(response);
};

