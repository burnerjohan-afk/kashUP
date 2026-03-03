import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_STORAGE_KEY = 'kashup-auth-token';
let inMemoryToken: string | null | undefined = undefined;
const listeners = new Set<(token: string | null) => void>();

const notify = (token: string | null) => {
  listeners.forEach((listener) => listener(token));
};

export const subscribeToAuthToken = (listener: (token: string | null) => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getAuthToken = async (): Promise<string | null> => {
  if (inMemoryToken !== undefined) {
    return inMemoryToken;
  }

  try {
    const stored = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    inMemoryToken = stored;
    return stored;
  } catch (error) {
    console.warn('[authTokenStore] Impossible de lire le token', error);
    inMemoryToken = null;
    return null;
  }
};

export const setAuthToken = async (token: string | null) => {
  inMemoryToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('[authTokenStore] Impossible de persister le token', error);
  }
  notify(token);
};

export const clearAuthToken = async () => setAuthToken(null);

