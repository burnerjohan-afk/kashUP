import { useEffect, useState } from 'react';
import { formatDistanceToNow, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

type OfferCountdownProps = {
  endAt: string | null | undefined;
};

export const OfferCountdown = ({ endAt }: OfferCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('—');

  useEffect(() => {
    if (!endAt) {
      setTimeRemaining('Date non définie');
      return;
    }

    const updateCountdown = () => {
      const endDate = new Date(endAt);
      
      if (!isValid(endDate)) {
        setTimeRemaining('Date invalide');
        return;
      }

      const now = new Date();
      
      if (endDate <= now) {
        setTimeRemaining('Expirée');
        return;
      }

      try {
        const distance = formatDistanceToNow(endDate, {
          addSuffix: false,
          locale: fr,
        });
        setTimeRemaining(distance);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('Erreur formatDistanceToNow:', error);
        }
        setTimeRemaining('Date invalide');
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [endAt]);

  return (
    <div className="text-xs text-ink/60">
      <span className="font-medium">Temps restant :</span> {timeRemaining}
    </div>
  );
};

