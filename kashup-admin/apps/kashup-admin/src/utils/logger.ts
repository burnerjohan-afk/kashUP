/**
 * Logger structuré pour les requêtes API
 * Utilisé uniquement en développement
 */

type LogLevel = 'info' | 'warn' | 'error';

interface ApiLog {
  method: string;
  url: string;
  requestId?: string;
  statusCode?: number;
  statusText?: string;
  duration?: number;
  error?: string;
}

export const logger = {
  /**
   * Logger une requête API
   */
  logRequest: (method: string, url: string, requestId?: string) => {
    if (!import.meta.env.DEV) return;
    
    console.group(`[API] ${method} ${url}`);
    if (requestId) {
      console.log(`Request ID: ${requestId}`);
    }
  },

  /**
   * Logger une réponse API
   */
  logResponse: (log: ApiLog) => {
    if (!import.meta.env.DEV) return;

    const { method, url, requestId, statusCode, statusText, duration, error } = log;
    
    if (error) {
      console.error(`[API] ${method} ${url} [ERROR] ${error}`, {
        requestId,
        duration: duration ? `${duration}ms` : undefined,
      });
    } else if (statusCode) {
      const status = statusCode >= 200 && statusCode < 300 ? 'OK' : 'ERROR';
      console.log(`[API] ${method} ${url} [${statusCode} ${status}]`, {
        requestId,
        statusText,
        duration: duration ? `${duration}ms` : undefined,
      });
    }
    
    console.groupEnd();
  },

  /**
   * Logger une erreur
   */
  logError: (message: string, error?: unknown, context?: Record<string, unknown>) => {
    if (!import.meta.env.DEV) return;
    
    console.error(`[API Error] ${message}`, {
      error,
      ...context,
    });
  },
};

