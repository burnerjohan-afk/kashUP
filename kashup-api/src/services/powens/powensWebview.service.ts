import env from '../../config/env';
import { generateState } from './powensAuth.service';

/**
 * Service pour générer l'URL Webview Powens
 */
export interface WebviewUrlParams {
  userId: string;
  temporaryCode?: string;
}

/**
 * Génère l'URL Webview Powens pour connecter une banque
 * Selon la doc Powens Webview
 */
export const getWebviewConnectUrl = ({ userId, temporaryCode }: WebviewUrlParams): string => {
  const state = generateState(userId);
  const baseUrl = `https://${env.POWENS_DOMAIN}.biapi.pro/2.0/auth/webview/connect`;

  const params = new URLSearchParams({
    client_id: env.POWENS_CLIENT_ID,
    redirect_uri: env.POWENS_REDIRECT_URI,
    state
  });

  // Si on a un temporary_code, l'ajouter
  if (temporaryCode) {
    params.append('temporary_code', temporaryCode);
  }

  return `${baseUrl}?${params.toString()}`;
};

