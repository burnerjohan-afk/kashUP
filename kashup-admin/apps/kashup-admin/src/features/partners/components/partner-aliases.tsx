import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  fetchPartnerAliases,
  createPartnerAlias,
  deletePartnerAlias,
  type PartnerAlias,
} from '../api';

type PartnerAliasesProps = {
  partnerId: string;
  partnerName: string;
};

export const PartnerAliases = ({ partnerId, partnerName }: PartnerAliasesProps) => {
  const queryClient = useQueryClient();
  const [aliasText, setAliasText] = useState('');
  const [priority, setPriority] = useState<number>(1);

  const aliasesQuery = useQuery({
    queryKey: ['partner-aliases', partnerId],
    queryFn: () => fetchPartnerAliases(partnerId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { aliasText: string; priority?: number }) =>
      createPartnerAlias(partnerId, data),
    onSuccess: () => {
      toast.success('Alias ajouté');
      setAliasText('');
      setPriority(1);
      void queryClient.invalidateQueries({ queryKey: ['partner-aliases', partnerId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de l\'ajout');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (aliasId: string) => deletePartnerAlias(partnerId, aliasId),
    onSuccess: () => {
      toast.success('Alias supprimé');
      void queryClient.invalidateQueries({ queryKey: ['partner-aliases', partnerId] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression');
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const text = aliasText.trim();
    if (!text) {
      toast.error('Saisissez un libellé pour l\'alias');
      return;
    }
    createMutation.mutate({ aliasText: text, priority: priority || 1 });
  };

  const aliases = aliasesQuery.data ?? [];

  return (
    <Card
      title="Alias cashback (Powens)"
      description="Libellés utilisés pour reconnaître les transactions bancaires de ce partenaire et attribuer le cashback. Priorité : plus la valeur est élevée, plus l’alias est prioritaire en cas de correspondance multiple."
    >
      <div className="space-y-6">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg border border-ink/10 bg-ink/5 p-4">
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium uppercase text-ink/60">
              Libellé alias *
            </label>
            <Input
              placeholder="Ex: CARREFOUR MARTINIQUE, CARREFOUR MARKET"
              value={aliasText}
              onChange={(e) => setAliasText(e.target.value)}
              maxLength={500}
            />
          </div>
          <div className="w-24">
            <label className="mb-1 block text-xs font-medium uppercase text-ink/60">
              Priorité
            </label>
            <Input
              type="number"
              min={0}
              max={100}
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value) || 1)}
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Ajout…' : 'Ajouter'}
          </Button>
        </form>

        {aliasesQuery.isLoading && <p className="text-sm text-ink/50">Chargement…</p>}
        {aliasesQuery.error && (
          <p className="text-sm text-red-500">
            {aliasesQuery.error instanceof Error ? aliasesQuery.error.message : 'Erreur'}
          </p>
        )}
        {aliases.length === 0 && !aliasesQuery.isLoading && (
          <p className="text-sm text-ink/50">
            Aucun alias. Ajoutez des libellés (ex. raison sociale, marque) pour que le moteur
            cashback associe les opérations bancaires à ce partenaire.
          </p>
        )}
        {aliases.length > 0 && (
          <ul className="space-y-2">
            {aliases.map((alias: PartnerAlias) => (
              <li
                key={alias.id}
                className="flex items-center justify-between gap-4 rounded border border-ink/10 bg-white px-3 py-2"
              >
                <span className="font-mono text-sm text-ink">{alias.aliasText}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-ink/10 px-2 py-0.5 text-xs text-ink/70">
                    Priorité {alias.priority}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => deleteMutation.mutate(alias.id)}
                    disabled={deleteMutation.isPending}
                  >
                    Supprimer
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
};
