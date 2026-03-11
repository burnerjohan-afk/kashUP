/**
 * Gestionnaire de session avec expiration automatique
 * Conforme aux bonnes pratiques de sécurité
 */

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';

const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_TIME = 2 * 60 * 1000; // Avertir 2 minutes avant expiration

export const useSessionManager = () => {
  const { clearSession, isAuthenticated } = useAuthStore();
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setTimeRemaining(null);
      setShowWarning(false);
      return;
    }

    let lastActivity = Date.now();
    let warningShown = false;
    let timeoutId: NodeJS.Timeout | null = null;
    let warningTimeoutId: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      const elapsed = Date.now() - lastActivity;
      const remaining = SESSION_TIMEOUT - elapsed;

      if (remaining <= 0) {
        clearSession();
        window.location.href = '/login?reason=timeout';
        return;
      }

      setTimeRemaining(remaining);

      // Afficher l'avertissement 2 minutes avant expiration
      if (remaining <= WARNING_TIME && !warningShown) {
        warningShown = true;
        setShowWarning(true);
      }
    };

    const onActivity = () => {
      lastActivity = Date.now();
      if (warningShown) {
        warningShown = false;
        setShowWarning(false);
      }
    };

    // Événements d'activité utilisateur
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    activityEvents.forEach((event) => {
      document.addEventListener(event, onActivity, { passive: true });
    });

    // Mettre à jour le timer toutes les secondes
    const intervalId = setInterval(updateTimer, 1000);
    updateTimer();

    return () => {
      clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
      if (warningTimeoutId) clearTimeout(warningTimeoutId);
      activityEvents.forEach((event) => {
        document.removeEventListener(event, onActivity);
      });
    };
  }, [isAuthenticated, clearSession]);

  const extendSession = () => {
    // Le refresh sera géré automatiquement par l'activité utilisateur
    setShowWarning(false);
  };

  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 1000 / 60);
    const seconds = Math.floor((ms / 1000) % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    showWarning,
    extendSession,
    formatTimeRemaining,
  };
};

/**
 * Composant d'avertissement d'expiration de session
 */
export const SessionWarning = () => {
  const { showWarning, timeRemaining, extendSession, formatTimeRemaining } = useSessionManager();

  if (!showWarning || !timeRemaining) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-warning/20 bg-warning/10 p-4 shadow-lg">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-warning">
            ⚠️ Votre session expire dans {formatTimeRemaining(timeRemaining)}
          </p>
          <p className="text-xs text-ink/70">
            Cliquez sur "Prolonger" pour continuer votre session
          </p>
        </div>
        <button
          onClick={extendSession}
          className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Prolonger
        </button>
      </div>
    </div>
  );
};

