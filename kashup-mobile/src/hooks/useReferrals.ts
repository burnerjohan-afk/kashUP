import { useCallback, useEffect, useState } from 'react';
import {
  getReferralInvitees,
  getReferralSummary,
  ReferralInvitee,
  ReferralSummary,
} from '../services/referralService';

const formatError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return 'Impossible de charger vos parrainages.';
};

export const useReferrals = () => {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [invitees, setInvitees] = useState<ReferralInvitee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryResponse, inviteesResponse] = await Promise.all([getReferralSummary(), getReferralInvitees()]);
      setSummary(summaryResponse);
      setInvitees(inviteesResponse);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    summary,
    invitees,
    loading,
    error,
    refetch: fetchData,
  };
};


