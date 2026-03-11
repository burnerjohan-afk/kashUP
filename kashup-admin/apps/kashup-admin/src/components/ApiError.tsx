/**
 * Composant pour afficher les erreurs API de manière cohérente
 */

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { ApiError } from '@/types/api';

type ApiErrorProps = {
  error: ApiError | Error | unknown;
  onRetry?: () => void;
  title?: string;
};

export const ApiError = ({ error, onRetry, title = 'Erreur' }: ApiErrorProps) => {
  let message = 'Une erreur est survenue';
  let statusCode: number | undefined;
  let errorCode: string | undefined;

  if (error && typeof error === 'object' && 'statusCode' in error) {
    const apiError = error as ApiError;
    message = apiError.message || message;
    statusCode = apiError.statusCode;
    errorCode = apiError.meta?.details?.code;
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <Card className="border-warning/20 bg-warning/5">
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-warning">{title}</h3>
          <p className="mt-2 text-sm text-ink/70">{message}</p>
          {errorCode && (
            <p className="mt-1 text-xs text-ink/50">Code: {errorCode}</p>
          )}
          {statusCode && (
            <p className="mt-1 text-xs text-ink/50">Status: {statusCode}</p>
          )}
        </div>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Réessayer
          </Button>
        )}
      </div>
    </Card>
  );
};

