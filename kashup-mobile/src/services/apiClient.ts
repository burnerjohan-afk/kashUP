/**
 * @deprecated Utilisez src/services/api.ts à la place
 * Ce fichier est conservé pour la compatibilité avec l'ancien code
 * Il utilise maintenant le nouveau système StandardResponse en interne
 */

import { apiClient as newApiClient, getAuthToken } from './api';
import { unwrapStandardResponse, StandardResponse } from '../types/api';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

// Wrapper pour maintenir la compatibilité avec l'ancien code
const legacyApiClient = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig) => {
    const response = await newApiClient<T>('GET', url, undefined, config?.params);
    return {
      data: unwrapStandardResponse(response),
      status: response.statusCode,
      statusText: response.message,
    };
  },
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await newApiClient<T>('POST', url, data, config?.params);
    return {
      data: unwrapStandardResponse(response),
      status: response.statusCode,
      statusText: response.message,
    };
  },
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await newApiClient<T>('PUT', url, data, config?.params);
    return {
      data: unwrapStandardResponse(response),
      status: response.statusCode,
      statusText: response.message,
    };
  },
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig) => {
    const response = await newApiClient<T>('PATCH', url, data, config?.params);
    return {
      data: unwrapStandardResponse(response),
      status: response.statusCode,
      statusText: response.message,
    };
  },
  delete: async <T = any>(url: string, config?: AxiosRequestConfig) => {
    const response = await newApiClient<T>('DELETE', url, config?.data, config?.params);
    return {
      data: unwrapStandardResponse(response),
      status: response.statusCode,
      statusText: response.message,
    };
  },
} as unknown as AxiosInstance;

export default legacyApiClient;

