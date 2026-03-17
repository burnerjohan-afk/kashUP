import { Linking } from 'react-native';
import { getApiBaseUrl } from '../src/config/api';
import { getAuthToken } from '../src/services/api';

const POWENS_API_BASE = 'https://api.powens.com/v2';

const MOCK_ACCOUNTS = [
  { id: 'mock-1', label: 'Banque Populaire', status: 'Synchronisé', lastSync: 'Aujourd’hui, 09:13' },
  { id: 'mock-2', label: 'Crédit Agricole', status: 'Reconnexion nécessaire', lastSync: 'Il y a 4 jours' },
];

const MOCK_TRANSACTIONS = [
  { id: 'op-1', label: 'Carrefour Dillon', amount: -42.5, date: '28 nov.', category: 'Courses', matched: true },
  { id: 'op-2', label: 'Fnac', amount: -68.9, date: '27 nov.', category: 'Culture & high-tech', matched: true },
  { id: 'op-3', label: 'Restaurant Les Palétuviers', amount: -32.0, date: '26 nov.', category: 'Restaurants', matched: false },
  { id: 'op-4', label: 'Pharmacie Santé Plus', amount: -18.8, date: '24 nov.', category: 'Santé & bien-être', matched: true },
];

export type PowensAccount = {
  id: string;
  label: string;
  status: string;
  lastSync: string;
};

export type PowensTransaction = {
  id: string;
  label: string;
  amount: number;
  date: string;
  category: string;
  matched: boolean;
};

const getApiKey = () => process.env.EXPO_PUBLIC_POWENS_API_KEY;

/**
 * Récupère l'URL Webview Powens depuis l'API KashUP (flow temporary code + state).
 * À utiliser en priorité pour que le callback et la connexion soient liés au compte utilisateur.
 */
export async function getKashupPowensWebviewUrl(): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const token = await getAuthToken();
  if (!token) {
    throw new Error('Vous devez être connecté pour lier une banque.');
  }
  const response = await fetch(`${baseUrl}/integrations/powens/webview-url`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || 'Impossible de récupérer le lien Powens');
  }
  const json = await response.json();
  const url = json?.data?.webviewUrl;
  if (!url || typeof url !== 'string') {
    throw new Error('Lien Powens indisponible');
  }
  return url;
}

export async function createPowensSession(token: string) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('POWENS_API_KEY manquant');
    return { connect_url: 'https://play.powens.com/sandbox/connect' };
  }
  const response = await fetch(`${POWENS_API_BASE}/connect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      end_user_id: token,
      scopes: ['account-details', 'operations'],
    }),
  });
  if (!response.ok) {
    throw new Error('Impossible de créer la session Powens');
  }
  return response.json();
}

export async function fetchPowensAccounts(userId: string): Promise<PowensAccount[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return MOCK_ACCOUNTS;
  }
  try {
    const response = await fetch(`${POWENS_API_BASE}/accounts?end_user_id=${userId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error('Erreur de récupération des comptes Powens');
    }
    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data : payload;
    return data.map((account: any) => ({
      id: account.id?.toString() ?? String(Math.random()),
      label: account.name ?? account.institution_name ?? 'Compte bancaire',
      status: account.status ?? 'Synchronisé',
      lastSync: account.last_update ?? 'Synchronisé il y a quelques minutes',
    }));
  } catch (error) {
    console.warn('fetchPowensAccounts', error);
    return MOCK_ACCOUNTS;
  }
}

export async function fetchPowensTransactions(userId: string): Promise<PowensTransaction[]> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return MOCK_TRANSACTIONS;
  }
  try {
    const response = await fetch(`${POWENS_API_BASE}/operations?end_user_id=${userId}&limit=10`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error('Erreur de récupération des opérations Powens');
    }
    const payload = await response.json();
    const data = Array.isArray(payload?.data) ? payload.data : payload;
    return data.map((operation: any) => ({
      id: operation.id?.toString() ?? String(Math.random()),
      label: operation.label ?? operation.original_label ?? 'Opération bancaire',
      amount: Number(operation.amount) ?? 0,
      date: operation.date ?? operation.updated_at ?? '',
      category: operation.category ?? 'Autres',
      matched: operation.merchant_category_code === 'KASHUP' || !!operation.meta?.kashup,
    }));
  } catch (error) {
    console.warn('fetchPowensTransactions', error);
    return MOCK_TRANSACTIONS;
  }
}

export async function openPowensFlow(sessionUrl: string) {
  try {
    await Linking.openURL(sessionUrl);
  } catch (error) {
    console.warn('openPowensFlow', error);
    throw error;
  }
}

