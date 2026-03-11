import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/data-table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUp, ArrowDown } from 'lucide-react';
import type { User } from '@/types/entities';
import { fetchUsers } from '../api';
import type { UsersFilters } from '../api';
import { formatCurrency } from '@/lib/utils/format';
import { UserTabs } from '../components/user-tabs';
import { usePermissions } from '@/lib/permissions/permissions';
import { maskEmail } from '@/lib/utils/privacy';

const statusLabels: Record<User['status'], string> = {
  active: 'Actif',
  kyc_pending: 'KYC en attente',
  kyc_blocked: 'KYC bloqué',
  suspended: 'Suspendu',
};

const territoryLabels = {
  all: 'Tous territoires',
  national: 'National',
  idf: 'Île-de-France',
  south: 'Sud',
  west: 'Ouest',
  overseas: 'Outre-mer',
} as const;

const statusOptions: Array<{ value: UsersFilters['status']; label: string }> = [
  { value: 'all', label: 'Tous statuts' },
  { value: 'active', label: 'Actifs' },
  { value: 'kyc_pending', label: 'KYC en attente' },
  { value: 'kyc_blocked', label: 'KYC bloqués' },
  { value: 'suspended', label: 'Suspendus' },
];

const useUserColumns = (onSelect: (user: User) => void) => {
  const { hasPermission } = usePermissions();
  const canViewEmail = hasPermission('users:view_email');

  return useMemo<ColumnDef<User>[]>(() => {
    return [
      {
        header: 'Utilisateur',
        accessorKey: 'fullName',
        cell: ({ row }) => (
          <div>
            <p className="font-semibold text-ink">{row.original.fullName}</p>
            <p className="text-xs text-ink/60">
              {canViewEmail ? row.original.email : maskEmail(row.original.email)}
            </p>
          </div>
        ),
      },
      {
        header: 'KYC / Statut',
        cell: ({ row }) => (
          <div className="space-y-1">
            <Badge tone={row.original.status === 'active' ? 'success' : 'warning'}>
              {statusLabels[row.original.status]}
            </Badge>
            <p className="text-xs text-ink/50 capitalize">{row.original.kycLevel}</p>
          </div>
        ),
      },
      {
        header: 'Territoire',
        accessorKey: 'territory',
        cell: ({ row }) => <p className="text-sm capitalize">{row.original.territory}</p>,
      },
      {
        header: 'Cashback',
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="text-ink">{formatCurrency(row.original.wallet.balanceCashback)}</p>
          </div>
        ),
      },
      {
        header: 'Points',
        cell: ({ row }) => (
          <div className="text-sm">
            <p className="text-ink">{row.original.wallet.balancePoints.toLocaleString()} pts</p>
          </div>
        ),
      },
      {
        header: 'Évolution transactions',
        cell: ({ row }) => {
          const growth = row.original.transactionGrowth ?? 0;
          return (
            <div className="flex items-center gap-1">
              {growth > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-500" />
              ) : growth < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span className="text-sm text-ink">
                {growth > 0 ? '+' : ''}
                {growth.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
      {
        header: 'Évolution panier moyen',
        cell: ({ row }) => {
          const growth = row.original.averageBasketGrowth ?? 0;
          return (
            <div className="flex items-center gap-1">
              {growth > 0 ? (
                <ArrowUp className="h-4 w-4 text-green-500" />
              ) : growth < 0 ? (
                <ArrowDown className="h-4 w-4 text-red-500" />
              ) : null}
              <span className="text-sm text-ink">
                {growth > 0 ? '+' : ''}
                {growth.toFixed(1)}%
              </span>
            </div>
          );
        },
      },
      {
        header: 'Actions',
        cell: ({ row }) => (
          <Button variant="secondary" className="text-xs" onClick={() => onSelect(row.original)}>
            Ouvrir
          </Button>
        ),
      },
    ];
  }, [onSelect, canViewEmail]);
};

export const UsersPage = () => {
  const [filters, setFilters] = useState<UsersFilters>({
    search: '',
    status: 'all',
    territory: 'all',
    page: 1,
    pageSize: 20,
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
  });

  const columns = useUserColumns((user) => setSelectedUser(user));

  const nextPage = () =>
    setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }));
  const prevPage = () =>
    setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }));

  return (
    <div className="space-y-6">
      <Card title="Filtrer" description="Recherche, statut KYC, territoire">
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            placeholder="Rechercher un utilisateur"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value, page: 1 }))}
          />
          <Select
            value={filters.status}
            onChange={(event) =>
              setFilters((prev) => ({ ...prev, status: event.target.value as UsersFilters['status'], page: 1 }))
            }
          >
            {statusOptions.map((option) => (
              <option value={option.value ?? 'all'} key={option.label}>
                {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={filters.territory}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                territory: event.target.value as UsersFilters['territory'],
                page: 1,
              }))
            }
          >
            {Object.entries(territoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card title="Utilisateurs" description="Liste paginée avec statut KYC">
        {usersQuery.isLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <>
            <DataTable columns={columns} data={usersQuery.data?.items ?? []} />
            <div className="mt-4 flex items-center justify-between text-sm text-ink/60">
              <Button variant="secondary" onClick={prevPage} disabled={(filters.page ?? 1) === 1}>
                Page précédente
              </Button>
              <span>
                Page {filters.page} /{' '}
                {usersQuery.data
                  ? Math.ceil(usersQuery.data.total / (usersQuery.data.pageSize ?? 20))
                  : 1}
              </span>
              <Button
                variant="secondary"
                onClick={nextPage}
                disabled={
                  usersQuery.data
                    ? filters.page! >= Math.ceil(usersQuery.data.total / usersQuery.data.pageSize)
                    : false
                }
              >
                Page suivante
              </Button>
            </div>
          </>
        )}
      </Card>

      {selectedUser && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="ghost" onClick={() => setSelectedUser(null)}>
              Fermer
            </Button>
          </div>
          <UserTabs user={selectedUser} />
        </div>
      )}
    </div>
  );
};


