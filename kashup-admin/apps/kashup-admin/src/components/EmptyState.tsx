/**
 * Composant pour afficher un état vide de manière cohérente
 * Jamais de chiffres inventés - affiche uniquement ce qui vient de l'API
 */

import { Card } from '@/components/ui/card';

type EmptyStateProps = {
  message?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const EmptyState = ({
  message = 'Aucune donnée',
  description,
  icon,
}: EmptyStateProps) => {
  return (
    <Card className="border-ink/10">
      <div className="flex flex-col items-center justify-center p-12 text-center">
        {icon && <div className="mb-4 text-ink/30">{icon}</div>}
        <p className="text-lg font-semibold text-ink/70">{message}</p>
        {description && (
          <p className="mt-2 text-sm text-ink/50">{description}</p>
        )}
      </div>
    </Card>
  );
};

