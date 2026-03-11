import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2 } from 'lucide-react';
import { fetchAIAnalysis } from '../api';
import { normalizeArray } from '../normalizeDashboard';
import type { Territory } from '@/types/entities';
import type { AIAnalysis } from '../api';

type AIAnalysisProps = {
  territory: Territory | 'all';
};

export const AIAnalysis = ({ territory }: AIAnalysisProps) => {
  const analysisQuery = useQuery({
    queryKey: ['ai-analysis', territory],
    queryFn: () => fetchAIAnalysis(territory),
    enabled: !!territory,
  });

  if (analysisQuery.isLoading) {
    return (
      <Card title="Analyse IA" description="Analyse des statistiques et recommandations">
        <div className="flex items-center justify-center gap-3 p-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-ink/70">Génération de l'analyse en cours...</p>
        </div>
      </Card>
    );
  }

  // Note: Les erreurs sont gérées dans fetchAIAnalysis() qui retourne une analyse vide
  // avec message "L'analyse IA n'est pas disponible pour le moment" en cas d'erreur
  if (!analysisQuery.data) {
    return (
      <Card title="Analyse IA" description="Analyse des statistiques et recommandations">
        <div className="p-6 text-center text-ink/50">Chargement de l'analyse...</div>
      </Card>
    );
  }

  const analysis = analysisQuery.data;
  const actionPlan = normalizeArray(analysis.actionPlan);

  return (
    <Card
      title="Analyse IA"
      description="Analyse des statistiques et recommandations"
      actions={
        <Badge tone="primary" className="flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Généré par IA
        </Badge>
      }
    >
      <div className="space-y-6">
        <div>
          <h4 className="mb-3 text-sm font-semibold text-primary">Compte rendu des statistiques</h4>
          <div className="rounded-lg border border-ink/10 bg-ink/2 p-4">
            <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-line">{analysis.summary}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-primary">Analyse des évolutions</h4>
          <div className="rounded-lg border border-ink/10 bg-ink/2 p-4">
            <p className="text-sm leading-relaxed text-ink/80 whitespace-pre-line">{analysis.evolutionAnalysis}</p>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold text-primary">Plan d'action recommandé</h4>
          <div className="space-y-3">
            {actionPlan.map((action, index) => (
              <div key={index} className="rounded-lg border border-ink/10 bg-ink/2 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Badge tone={action.type === 'boost' ? 'success' : action.type === 'lottery' ? 'warning' : 'primary'}>
                    {action.type === 'boost' ? 'Boost' : action.type === 'lottery' ? 'Loterie' : 'Autre'}
                  </Badge>
                  <span className="text-sm font-semibold text-ink">{action.title}</span>
                </div>
                <p className="text-sm text-ink/70">{action.description}</p>
                {action.expectedImpact && (
                  <p className="mt-2 text-xs text-ink/50">
                    Impact attendu : {action.expectedImpact}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            variant="secondary"
            onClick={() => void analysisQuery.refetch()}
            className="flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Régénérer l'analyse
          </Button>
        </div>
      </div>
    </Card>
  );
};

