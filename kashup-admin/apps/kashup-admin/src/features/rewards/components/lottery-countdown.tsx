import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

type LotteryCountdownProps = {
  startAt: string;
  endAt: string;
};

export const LotteryCountdown = ({ startAt, endAt }: LotteryCountdownProps) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [status, setStatus] = useState<'upcoming' | 'active' | 'ended'>('active');

  useEffect(() => {
    const updateCountdown = () => {
      const startDate = new Date(startAt);
      const endDate = new Date(endAt);
      const now = new Date();

      if (now < startDate) {
        setStatus('upcoming');
        const distance = formatDistanceToNow(startDate, {
          addSuffix: false,
          locale: fr,
        });
        setTimeRemaining(`Début dans : ${distance}`);
        return;
      }

      if (now >= endDate) {
        setStatus('ended');
        setTimeRemaining('Terminée');
        return;
      }

      setStatus('active');
      const distance = formatDistanceToNow(endDate, {
        addSuffix: false,
        locale: fr,
      });
      setTimeRemaining(`Temps restant : ${distance}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [startAt, endAt]);

  const statusColors = {
    upcoming: 'text-blue-500',
    active: 'text-green-500',
    ended: 'text-red-500',
  };

  return (
    <div className={`text-xs font-medium ${statusColors[status]}`}>{timeRemaining}</div>
  );
};

