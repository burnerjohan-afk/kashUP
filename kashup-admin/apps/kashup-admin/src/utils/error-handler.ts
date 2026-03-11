/**
 * Gestionnaire d'erreurs global pour ignorer les erreurs non bloquantes
 * (ex: Google Translate, extensions navigateur, Prisma Studio, etc.)
 */

/**
 * Vérifier si une erreur doit être ignorée
 */
export const shouldIgnoreError = (error: unknown): boolean => {
  if (!error) return false;

  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorString = String(error);

  // Erreurs Google Translate (non bloquantes)
  if (
    errorMessage.includes('translate-pa.googleapis.com') ||
    errorString.includes('translate-pa.googleapis.com') ||
    errorMessage.includes('ERR_NETWORK_CHANGED') ||
    errorString.includes('ERR_NETWORK_CHANGED')
  ) {
    return true;
  }

  // Erreurs d'extensions navigateur (non bloquantes)
  if (
    errorMessage.includes('chrome-extension://') ||
    errorString.includes('chrome-extension://') ||
    errorMessage.includes('moz-extension://') ||
    errorString.includes('moz-extension://')
  ) {
    return true;
  }

  // Erreurs Prisma Studio (non bloquantes)
  // - Erreurs 404 pour les polices depuis localhost:5556
  // - Erreurs de base de données dans Prisma Studio
  if (
    errorMessage.includes('localhost:5556') ||
    errorString.includes('localhost:5556') ||
    errorMessage.includes(':5556') ||
    errorString.includes(':5556') ||
    errorMessage.includes('.woff') ||
    errorString.includes('.woff2') ||
    errorMessage.includes('Count request failed for model') ||
    errorString.includes('Count request failed for model') ||
    errorMessage.includes('sidebarData.data is not observable') ||
    errorString.includes('sidebarData.data is not observable') ||
    errorMessage.includes('ensureIndexVisible') ||
    errorString.includes('ensureIndexVisible')
  ) {
    return true;
  }

  return false;
};

/**
 * Encapsuler une fonction pour ignorer les erreurs non bloquantes
 */
export const ignoreNonBlockingErrors = <T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (shouldIgnoreError(error)) {
        if (import.meta.env.DEV) {
          console.debug('🔇 Erreur non bloquante ignorée:', error);
        }
        return null;
      }
      throw error;
    }
  }) as T;
};

