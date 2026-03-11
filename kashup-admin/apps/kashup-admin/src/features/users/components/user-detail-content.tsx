import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, Coins } from 'lucide-react';
import type { GiftCard, Reward, Transaction, User } from '@/types/entities';
import {
  adjustWallet,
  fetchUserGiftCards,
  fetchUserRewards,
  fetchUserTransactions,
  forceUserKyc,
  resetUserPassword,
  walletAdjustmentSchema,
} from '../api';
import type { WalletAdjustmentInput } from '../api';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import type { ReactNode } from 'react';
import { useAuditLog } from '@/lib/audit/audit-logger';
import { PermissionGuard, usePermissions } from '@/lib/permissions/permissions';

const statusLabels: Record<User['status'], string> = {
  active: 'Actif',
  kyc_pending: 'KYC en attente',
  kyc_blocked: 'KYC bloqué',
  suspended: 'Suspendu',
};

type UserDetailContentProps = {
  user: User;
};

export const UserDetailContent = ({ user }: UserDetailContentProps) => {
  const auditLog = useAuditLog();
  const { hasPermission } = usePermissions();

  // 🔒 AUDIT: Logger l'accès à la fiche utilisateur (RGPD)
  useEffect(() => {
    if (user?.id) {
      auditLog.logUserView(user.id);
    }
  }, [user?.id, auditLog]);

  const transactionsQuery = useQuery({
    queryKey: ['user-transactions', user.id],
    queryFn: () => fetchUserTransactions(user.id),
  });

  const rewardsQuery = useQuery({
    queryKey: ['user-rewards', user.id],
    queryFn: () => fetchUserRewards(user.id),
  });

  const giftCardsQuery = useQuery({
    queryKey: ['user-gift-cards', user.id],
    queryFn: () => fetchUserGiftCards(user.id),
  });

  const resetMutation = useMutation({
    mutationFn: () => resetUserPassword(user.id),
    onSuccess: () => {
      auditLog.logPasswordReset(user.id);
      toast.success('Lien de réinitialisation envoyé');
    },
    onError: () => toast.error('Impossible de déclencher la réinitialisation'),
  });

  const kycMutation = useMutation({
    mutationFn: () => forceUserKyc(user.id),
    onSuccess: () => {
      auditLog.logKycForce(user.id);
      toast.success('KYC forcé avec succès');
    },
    onError: () => toast.error('Échec du forçage KYC'),
  });

  const walletMutation = useMutation({
    mutationFn: (payload: WalletAdjustmentInput) => adjustWallet(user.id, payload),
    onSuccess: (_data, variables) => {
      auditLog.logWalletAdjust(
        user.id,
        variables.amount,
        variables.type,
        variables.reason,
      );
      toast.success('Wallet mis à jour');
    },
    onError: () => toast.error('Échec de mise à jour du wallet'),
  });

  const walletForm = useForm<WalletAdjustmentInput>({
    resolver: zodResolver(walletAdjustmentSchema),
    defaultValues: {
      type: 'credit',
      source: 'cashback',
      amount: 10,
      reason: '',
    },
  });

  const submitWallet = (values: WalletAdjustmentInput) => void walletMutation.mutate(values);

  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <p className="text-xs uppercase text-ink/40">Email</p>
            <PermissionGuard
              permission="users:view_email"
              fallback={<p className="text-sm text-ink/50">Email masqué</p>}
            >
              <p className="text-sm text-ink">{user.email}</p>
            </PermissionGuard>
          </div>
          <PermissionGuard
            permission="users:view_sensitive"
            fallback={null}
          >
            {user.age && (
              <div>
                <p className="text-xs uppercase text-ink/40">Âge</p>
                <p className="text-sm text-ink">{user.age} ans</p>
              </div>
            )}
            {user.gender && (
              <div>
                <p className="text-xs uppercase text-ink/40">Sexe</p>
                <p className="text-sm capitalize text-ink">
                  {user.gender === 'male' ? 'Homme' : user.gender === 'female' ? 'Femme' : 'Autre'}
                </p>
              </div>
            )}
          </PermissionGuard>
          <div>
            <p className="text-xs uppercase text-ink/40">Statut</p>
            <Badge tone={user.status === 'active' ? 'success' : 'warning'}>
              {statusLabels[user.status]}
            </Badge>
          </div>
          <div>
            <p className="text-xs uppercase text-ink/40">Territoire</p>
            <p className="text-sm capitalize text-ink">{user.territory}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-ink/40">Dernière MAJ</p>
            <p className="text-sm text-ink">{formatDate(user.wallet.updatedAt)}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-lg bg-primary/20 p-2">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-ink/70">Cashback</p>
                </div>
                <p className="text-3xl font-bold text-primary">
                  {formatCurrency(user.wallet.balanceCashback)}
                </p>
                <p className="mt-1 text-xs text-ink/50">Solde disponible</p>
              </div>
            </div>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>

          <div className="relative overflow-hidden rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <div className="rounded-lg bg-green-500/20 p-2">
                    <Coins className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-ink/70">Points</p>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {user.wallet.balancePoints.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-ink/50">Points accumulés</p>
              </div>
            </div>
            <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-green-500/10 blur-2xl" />
          </div>
        </div>

        <PermissionGuard permission={['users:reset_password', 'users:modify_kyc']}>
          <div className="mt-4 flex gap-2">
            <PermissionGuard permission="users:reset_password">
              <Button
                variant="secondary"
                onClick={() => void resetMutation.mutate()}
                isLoading={resetMutation.isPending}
              >
                Reset mot de passe
              </Button>
            </PermissionGuard>
            <PermissionGuard permission="users:modify_kyc">
              <Button
                variant="secondary"
                onClick={() => void kycMutation.mutate()}
                isLoading={kycMutation.isPending}
              >
                Forcer KYC
              </Button>
            </PermissionGuard>
          </div>
        </PermissionGuard>
      </Card>

      <PermissionGuard
        permission="users:modify_wallet"
        fallback={
          <Card title="Créditer / débiter" description="Accès non autorisé">
            <p className="text-sm text-ink/50">Vous n'avez pas la permission de modifier le wallet</p>
          </Card>
        }
      >
        <Card title="Créditer / débiter" description="Flux enregistré via /transactions">
        <form
          className="grid gap-4 md:grid-cols-4"
          onSubmit={(event) => {
            void walletForm.handleSubmit(submitWallet)(event);
          }}
        >
          <div>
            <label className="text-xs uppercase text-ink/50">Type</label>
            <Select {...walletForm.register('type')}>
              <option value="credit">Crédit</option>
              <option value="debit">Débit</option>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase text-ink/50">Source</label>
            <Select {...walletForm.register('source')}>
              <option value="cashback">Cashback</option>
              <option value="points">Points</option>
            </Select>
          </div>
          <div>
            <label className="text-xs uppercase text-ink/50">Montant</label>
            <Input type="number" step="0.01" {...walletForm.register('amount', { valueAsNumber: true })} />
            {walletForm.formState.errors.amount && (
              <p className="text-xs text-warning">{walletForm.formState.errors.amount.message}</p>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="text-xs uppercase text-ink/50">Raison</label>
            <Input placeholder="Motif interne" {...walletForm.register('reason')} />
            {walletForm.formState.errors.reason && (
              <p className="text-xs text-warning">{walletForm.formState.errors.reason.message}</p>
            )}
          </div>
          <div className="md:col-span-4 text-right">
            <Button type="submit" isLoading={walletMutation.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Card>
      </PermissionGuard>

      <HistorySection
        title="Transactions"
        description="10 dernières entrées"
        isLoading={transactionsQuery.isLoading}
        empty="Aucune transaction"
        items={transactionsQuery.data}
        renderItem={(transaction) => (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink capitalize">{transaction.type}</p>
              <p className="text-xs text-ink/50">{formatDate(transaction.createdAt)}</p>
            </div>
            <Badge tone={transaction.status === 'flagged' ? 'warning' : 'success'}>
              {transaction.status}
            </Badge>
            <p className="text-sm font-semibold text-ink">
              {transaction.type === 'points'
                ? `${transaction.amount.toLocaleString()} pts`
                : formatCurrency(transaction.amount)}
            </p>
          </div>
        )}
      />

      <HistorySection
        title="Rewards"
        description="Boosts / badges"
        isLoading={rewardsQuery.isLoading}
        empty="Aucun reward"
        items={rewardsQuery.data}
        renderItem={(reward: Reward) => (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{reward.title}</p>
              <p className="text-xs text-ink/50 uppercase">{reward.type}</p>
            </div>
            <p className="text-xs text-ink/40">
              {reward.awardedAt ? formatDate(reward.awardedAt) : '—'}
            </p>
          </div>
        )}
      />

      <HistorySection
        title="Gift cards"
        description="Commandes récentes"
        isLoading={giftCardsQuery.isLoading}
        empty="Aucune carte"
        items={giftCardsQuery.data}
        renderItem={(card: GiftCard) => (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink">{card.partner}</p>
              <p className="text-xs text-ink/50">Valeur {formatCurrency(card.value)}</p>
            </div>
            <Badge tone={card.status === 'available' ? 'success' : 'warning'}>{card.status}</Badge>
          </div>
        )}
      />
    </div>
  );
};

type HistorySectionProps<T> = {
  title: string;
  description: string;
  items?: T[];
  isLoading: boolean;
  empty: string;
  renderItem: (item: T) => ReactNode;
};

const HistorySection = <T,>({
  title,
  description,
  items,
  isLoading,
  empty,
  renderItem,
}: HistorySectionProps<T>) => (
  <Card title={title} description={description}>
    {isLoading ? (
      <Skeleton className="h-24" />
    ) : !items || items.length === 0 ? (
      <p className="text-sm text-ink/50">{empty}</p>
    ) : (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-2xl border border-ink/5 p-3">
            {renderItem(item)}
          </div>
        ))}
      </div>
    )}
  </Card>
);

