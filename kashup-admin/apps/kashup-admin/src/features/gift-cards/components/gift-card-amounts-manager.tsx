import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GiftCardAmount } from '@/types/gifts';
import {
  fetchGiftCardAmounts,
  createGiftCardAmount,
  deleteGiftCardAmount,
} from '../api-cartes-up';

export const GiftCardAmountsManager = () => {
  const queryClient = useQueryClient();
  const [newAmount, setNewAmount] = useState<string>('');

  const amountsQuery = useQuery({
    queryKey: ['gift-card-amounts'],
    queryFn: fetchGiftCardAmounts,
  });

  const createMutation = useMutation({
    mutationFn: createGiftCardAmount,
    onSuccess: (data) => {
      console.log('[GiftCardAmountsManager] Montant créé avec succès:', data);
      toast.success('Montant créé avec succès');
      setNewAmount('');
      // Mettre à jour directement le cache avec le nouveau montant
      queryClient.setQueryData<GiftCardAmount[]>(['gift-card-amounts'], (oldData = []) => {
        console.log('[GiftCardAmountsManager] Mise à jour du cache, anciennes données:', oldData);
        const newData = [...oldData, data];
        console.log('[GiftCardAmountsManager] Nouvelles données:', newData);
        return newData;
      });
      // Invalider et refetch pour être sûr
      void queryClient.invalidateQueries({ queryKey: ['gift-card-amounts'] });
    },
    onError: (error: Error) => {
      console.error('[GiftCardAmountsManager] Erreur lors de la création du montant:', error);
      toast.error(error.message || 'Impossible de créer le montant');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGiftCardAmount,
    onSuccess: () => {
      toast.success('Montant supprimé');
      void queryClient.invalidateQueries({ queryKey: ['gift-card-amounts'] });
    },
    onError: () => toast.error('Impossible de supprimer le montant'),
  });

  const handleCreate = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const amount = parseFloat(newAmount);
    console.log('[GiftCardAmountsManager] Tentative d\'ajout du montant:', amount, 'Valeur saisie:', newAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Le montant doit être un nombre positif');
      return;
    }
    // Vérifier si le montant existe déjà
    const existingAmount = amountsQuery.data?.find((a) => a.amount === amount);
    if (existingAmount) {
      toast.error('Ce montant existe déjà');
      return;
    }
    console.log('[GiftCardAmountsManager] Appel de createMutation.mutate avec:', amount);
    createMutation.mutate(amount);
  };

  return (
    <Card title="Gestion des montants" description="Définir les montants disponibles pour les Cartes Up libres">
      <div className="space-y-4">
        <form
          onSubmit={handleCreate}
          className="flex gap-2"
        >
          <Input
            type="number"
            placeholder="Montant en euros (ex: 20)"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            min="1"
            step="0.01"
            required
          />
          <Button type="submit" isLoading={createMutation.isPending}>
            Ajouter
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-ink/50">Montants disponibles</p>
          <div className="grid gap-2 md:grid-cols-3 lg:grid-cols-5">
            {(amountsQuery.data ?? [])
              .sort((a, b) => a.amount - b.amount)
              .map((amount) => (
                <div
                  key={amount.id}
                  className="flex items-center justify-between rounded-lg border border-ink/10 bg-muted p-3"
                >
                  <span className="font-medium text-ink">{amount.amount}€</span>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (confirm(`Supprimer le montant de ${amount.amount}€ ?`)) {
                        deleteMutation.mutate(amount.id);
                      }
                    }}
                    isLoading={deleteMutation.isPending}
                    className="h-8 w-8 p-0"
                    title="Supprimer"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>
        </div>

        {amountsQuery.data?.length === 0 && (
          <p className="text-center text-sm text-ink/50">Aucun montant défini</p>
        )}
      </div>
    </Card>
  );
};

