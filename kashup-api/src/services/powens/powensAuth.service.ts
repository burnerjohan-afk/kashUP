import env from '../../config/env';
import { powensRequest } from './powens.client';
import crypto from 'crypto';

/**
 * Service d'authentification Powens via Temporary code flow
 */
export interface InitAuthResponse {
  temporary_code: string;
  expires_in?: number;
}

export interface ExchangeTokenResponse {
  access_token: string;
  expires_in?: number;
  user_id?: string;
}

/**
 * Initialise l'authentification Powens et récupère un temporary_code
 * POST /2.0/auth/init
 * Note: Utilise client_id et client_secret dans le body, pas d'API key
 */
export const initAuth = async (): Promise<InitAuthResponse> => {
  const url = `https://${env.POWENS_DOMAIN}.biapi.pro/2.0/auth/init`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.POWENS_CLIENT_ID,
      client_secret: env.POWENS_CLIENT_SECRET
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Powens init (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<InitAuthResponse>;
};

/**
 * Échange un temporary_code contre un access_token
 * POST /2.0/auth/token/access
 * Note: Utilise client_id et client_secret dans le body, pas d'API key
 */
export const exchangeTemporaryCode = async (
  temporaryCode: string
): Promise<ExchangeTokenResponse> => {
  const url = `https://${env.POWENS_DOMAIN}.biapi.pro/2.0/auth/token/access`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: env.POWENS_CLIENT_ID,
      client_secret: env.POWENS_CLIENT_SECRET,
      temporary_code: temporaryCode
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur Powens exchange (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<ExchangeTokenResponse>;
};

/**
 * Génère un state signé pour sécuriser le callback
 */
export const generateState = (userId: string): string => {
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac('sha256', env.POWENS_CLIENT_SECRET);
  hmac.update(payload);
  return `${payload}:${hmac.digest('hex')}`;
};

/**
 * Vérifie et extrait le userId depuis un state signé
 */
export const verifyState = (state: string): { userId: string; timestamp: number } | null => {
  try {
    const parts = state.split(':');
    if (parts.length !== 3) return null;

    const [userId, timestampStr, signature] = parts;
    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return null;

    // Vérifier que le state n'est pas trop ancien (5 minutes max)
    const age = Date.now() - timestamp;
    if (age > 5 * 60 * 1000) return null;

    const payload = `${userId}:${timestamp}`;
    const hmac = crypto.createHmac('sha256', env.POWENS_CLIENT_SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');

    if (signature !== expectedSignature) return null;

    return { userId, timestamp };
  } catch {
    return null;
  }
};

