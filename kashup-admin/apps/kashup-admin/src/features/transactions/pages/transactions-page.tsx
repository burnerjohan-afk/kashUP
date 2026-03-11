import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { Transaction } from '@/types/entities';
import {
  createManualTransaction,
  exportTransactions,
  fetchTransactions,
  flagTransaction,
  manualTransactionSchema,
} from '../api';
import type { ManualTransactionInput, TransactionsFilters } from '../api';

const statusTone: Record<Transaction['status'], 'success' | 'warning' | 'muted'> = {
  pending: 'muted',
  settled: 'success',
  flagged: 'warning',
};

export const TransactionsPage = () => {
  const [filters, setFilters] = useState<TransactionsFilters>({ source: 'all', status: 'all' });

  const transactionsQuery = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => fetchTransactions(filters),
    refetchInterval: 15_000,
  });

  const form = useForm<ManualTransactionInput>({
    resolver: zodResolver(manualTransactionSchema),
    defaultValues: {
      userId: '',
      type: 'cashback',
      amount: 10,
      partnerId: '',
      reason: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createManualTransaction,
    onSuccess: () => {
      toast.success('Transaction injectée');
      void transactionsQuery.refetch();
      form.reset();
    },
    onError: () => toast.error('Échec création transaction'),
  });

  const exportMutation = useMutation({
    mutationFn: () => exportTransactions(filters),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `transactions-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const flagMutation = useMutation({
    mutationFn: flagTransaction,
    onSuccess: () => {
      toast.success('Transaction flaggée');
      void transactionsQuery.refetch();
    },
    onError: () => toast.error('Impossible de flagger'),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
      <Card
        title="Flux temps réel"
        description="Filtres par source, statut, partenaire"
        actions={
          <Button
            variant="secondary"
            onClick={() => void exportMutation.mutate()}
            isLoading={exportMutation.isPending}
          >
            Export CSV
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            value={filters.source ?? 'all'}
            onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value as TransactionsFilters['source'] }))}
          >
            <option value="all">Toutes sources</option>
            <option value="cashback">Cashback</option>
            <option value="points">Points</option>
            <option value="boost">Boost</option>
          </Select>
          <Select
            value={filters.status ?? 'all'}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value as TransactionsFilters['status'] }))}
          >
            <option value="all">Tous statuts</option>
            <option value="pending">En attente</option>
            <option value="settled">Settled</option>
            <option value="flagged">Flagged</option>
          </Select>
          <Input
            placeholder="Filtrer par partenaire"
            value={filters.partnerId ?? ''}
            onChange={(event) => setFilters((prev) => ({ ...prev, partnerId: event.target.value }))}
          />
        </div>

        <div className="mt-6 space-y-3">
          {Array.isArray(transactionsQuery.data) && transactionsQuery.data.length > 0 ? (
            transactionsQuery.data.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onFlag={() => void flagMutation.mutate(transaction.id)}
                isFlagging={flagMutation.isPending}
              />
            ))
          ) : transactionsQuery.isLoading ? (
            <p className="text-sm text-ink/50">Chargement des transactions...</p>
          ) : (
            <p className="text-sm text-ink/50">Aucune transaction trouvée</p>
          )}
        </div>
      </Card>

      <Card title="Injection manuelle / QA" description="POST /transactions">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            void form.handleSubmit((values) => {
              void createMutation.mutate(values);
            })(event);
          }}
        >
          <Input placeholder="User ID" {...form.register('userId')} />
          <div className="grid gap-3 md:grid-cols-2">
            <Select {...form.register('type')}>
              <option value="cashback">Cashback</option>
              <option value="points">Points</option>
              <option value="boost">Boost</option>
            </Select>
            <Input type="number" step="0.01" {...form.register('amount', { valueAsNumber: true })} />
          </div>
          <Input placeholder="Partner ID (optionnel)" {...form.register('partnerId')} />
          <Input placeholder="Motif" {...form.register('reason')} />
          <Button type="submit" isLoading={createMutation.isPending}>
            Soumettre
          </Button>
        </form>
      </Card>
    </div>
  );
};

const TransactionRow = ({
  transaction,
  onFlag,
  isFlagging,
}: {
  transaction: Transaction;
  onFlag: () => void;
  isFlagging: boolean;
}) => (
  <div className="rounded-2xl border border-ink/5 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-ink capitalize">{transaction.type}</p>
        <p className="text-xs text-ink/50">{formatDate(transaction.createdAt)}</p>
      </div>
      <Badge tone={statusTone[transaction.status]}>{transaction.status}</Badge>
    </div>
    <div className="mt-2 flex items-center justify-between text-sm text-ink/70">
      <span>Utilisateur {transaction.userId}</span>
      <span>
        {transaction.type === 'points'
          ? `${transaction.amount.toLocaleString()} pts`
          : formatCurrency(transaction.amount)}
      </span>
    </div>
    <Button variant="ghost" className="mt-2 text-xs" onClick={onFlag} isLoading={isFlagging}>
      Marquer en fraude
    </Button>
  </div>
);

