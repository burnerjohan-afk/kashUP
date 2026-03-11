import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils/format';
import {
  createAdminRole,
  fetchAdminRoles,
  fetchAuditLogs,
  fetchCoffreFortConfig,
  fetchGlobalObjectives,
  fetchJackpotConfig,
  globalsFormSchema,
  roleFormSchema,
  updateAdminRole,
  updateCoffreFortConfig,
  updateGlobalObjectives,
  updateJackpotConfig,
} from '../api';
import type { GlobalsFormInput, RoleFormInput } from '../api';

export const SettingsPage = () => {
  const rolesQuery = useQuery({
    queryKey: ['admin-roles'],
    queryFn: fetchAdminRoles,
  });

  const globalsQuery = useQuery({
    queryKey: ['global-objectives'],
    queryFn: fetchGlobalObjectives,
  });

  const coffreFortQuery = useQuery({
    queryKey: ['coffre-fort-config'],
    queryFn: fetchCoffreFortConfig,
  });

  const jackpotConfigQuery = useQuery({
    queryKey: ['jackpot-config'],
    queryFn: fetchJackpotConfig,
  });

  const auditQuery = useQuery({
    queryKey: ['audit-log'],
    queryFn: fetchAuditLogs,
  });

  const globalsForm = useForm<GlobalsFormInput>({
    resolver: zodResolver(globalsFormSchema),
    defaultValues: {
      monthlyCashbackTarget: 1_000_000,
      pointsQuota: 2_000_000,
      donationsTarget: 200_000,
      powensQuota: 10_000,
    },
  });

  useEffect(() => {
    if (globalsQuery.data) {
      globalsForm.reset(globalsQuery.data);
    }
  }, [globalsQuery.data, globalsForm]);

  const roleForm = useForm<RoleFormInput>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      email: '',
      role: 'support',
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: createAdminRole,
    onSuccess: () => {
      toast.success('Utilisateur admin créé');
      void rolesQuery.refetch();
      roleForm.reset();
    },
    onError: () => toast.error('Impossible de créer le rôle'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: RoleFormInput['role'] }) =>
      updateAdminRole(id, { role }),
    onSuccess: () => {
      toast.success('Rôle mis à jour');
      void rolesQuery.refetch();
    },
    onError: () => toast.error('Échec de mise à jour du rôle'),
  });

  const updateGlobalsMutation = useMutation({
    mutationFn: updateGlobalObjectives,
    onSuccess: () => {
      toast.success('Objectifs sauvegardés');
      void globalsQuery.refetch();
    },
    onError: () => toast.error('Impossible de sauvegarder les objectifs'),
  });

  const updateCoffreFortMutation = useMutation({
    mutationFn: updateCoffreFortConfig,
    onSuccess: () => {
      toast.success('Config coffre-fort sauvegardée');
      void coffreFortQuery.refetch();
    },
    onError: () => toast.error('Impossible de sauvegarder la config coffre-fort'),
  });

  const updateJackpotMutation = useMutation({
    mutationFn: updateJackpotConfig,
    onSuccess: () => {
      toast.success('Config jackpot sauvegardée');
      void jackpotConfigQuery.refetch();
    },
    onError: () => toast.error('Impossible de sauvegarder la config jackpot'),
  });

  const onSubmitGlobals = (values: GlobalsFormInput) => void updateGlobalsMutation.mutate(values);
  const onSubmitRole = (values: RoleFormInput) => void createRoleMutation.mutate(values);
  const onSubmitCoffreFort = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const lockPeriodMonths = Number((form.querySelector('[name="lockPeriodMonths"]') as HTMLInputElement)?.value);
    const pointsPerEuroPerMonth = Number((form.querySelector('[name="pointsPerEuroPerMonth"]') as HTMLInputElement)?.value);
    if (!Number.isInteger(lockPeriodMonths) || lockPeriodMonths < 1 || pointsPerEuroPerMonth < 0) return;
    updateCoffreFortMutation.mutate({ lockPeriodMonths, pointsPerEuroPerMonth });
  };

  const onSubmitJackpot = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const getNum = (name: string) => Number((form.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value);
    const getNumOrNull = (name: string) => {
      const v = (form.querySelector(`[name="${name}"]`) as HTMLInputElement)?.value;
      if (v === '' || v == null) return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : n;
    };
    const maxDrawDateRaw = (form.querySelector('[name="maxDrawDate"]') as HTMLInputElement)?.value;
    updateJackpotMutation.mutate({
      cashbackContributionPercent: getNum('cashbackContributionPercent'),
      lotteryPointsContribution: getNum('lotteryPointsContribution'),
      challengePointsContribution: getNum('challengePointsContribution'),
      globalPartnerPurchaseAmountThreshold: getNum('globalPartnerPurchaseAmountThreshold'),
      globalActionsThreshold: getNum('globalActionsThreshold'),
      minActionsPerUser: getNum('minActionsPerUser'),
      minPartnerPurchasesPerUser: getNumOrNull('minPartnerPurchasesPerUser'),
      freeParticipationTickets: getNum('freeParticipationTickets'),
      partnerPurchaseTickets: getNum('partnerPurchaseTickets'),
      lotteryTicketTickets: getNum('lotteryTicketTickets'),
      challengeCompletionTickets: getNum('challengeCompletionTickets'),
      maxDrawDate: maxDrawDateRaw && maxDrawDateRaw.trim() !== '' ? maxDrawDateRaw.trim() : null,
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
      <div className="space-y-6">
        <Card title="Rôles & permissions" description="Gestion des accès admin/support">
          <div className="space-y-3">
            {(rolesQuery.data ?? []).map((role) => (
              <div
                key={role.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/5 p-4"
              >
                <div>
                  <p className="font-semibold text-ink">{role.fullName}</p>
                  <p className="text-xs text-ink/50">{role.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={role.role === 'admin' ? 'primary' : role.role === 'partner_manager' ? 'success' : 'muted'}>
                    {role.role}
                  </Badge>
                  <Select
                    value={role.role}
                    onChange={(event) =>
                      void updateRoleMutation.mutate({
                        id: role.id,
                        role: event.target.value as RoleFormInput['role'],
                      })
                    }
                  >
                    <option value="admin">Admin</option>
                    <option value="support">Support</option>
                    <option value="partner_manager">Partner manager</option>
                  </Select>
                </div>
              </div>
            ))}
          </div>

          <form
            className="mt-6 grid gap-3 md:grid-cols-3"
            onSubmit={(event) => {
              void roleForm.handleSubmit(onSubmitRole)(event);
            }}
          >
            <Input
              className="md:col-span-2"
              placeholder="Email (ops@kashup.com)"
              {...roleForm.register('email')}
            />
            <Select {...roleForm.register('role')}>
              <option value="support">Support</option>
              <option value="partner_manager">Partner manager</option>
              <option value="admin">Admin</option>
            </Select>
            {roleForm.formState.errors.email && (
              <p className="text-xs text-warning">{roleForm.formState.errors.email.message}</p>
            )}
            <div className="md:col-span-3 text-right">
              <Button type="submit" isLoading={createRoleMutation.isPending}>
                Inviter
              </Button>
            </div>
          </form>
        </Card>

        <Card title="Objectifs & quotas" description="Objectifs mensuels, quotas Powens">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              void globalsForm.handleSubmit(onSubmitGlobals)(event);
            }}
          >
            <div>
              <label className="text-xs uppercase text-ink/50">CA cashback cible</label>
              <Input
                type="number"
                {...globalsForm.register('monthlyCashbackTarget', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Quota points</label>
              <Input type="number" {...globalsForm.register('pointsQuota', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Objectif dons</label>
              <Input
                type="number"
                {...globalsForm.register('donationsTarget', { valueAsNumber: true })}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Quota Powens (comptes)</label>
              <Input type="number" {...globalsForm.register('powensQuota', { valueAsNumber: true })} />
            </div>
            <div className="md:col-span-2 text-right">
              <Button type="submit" isLoading={updateGlobalsMutation.isPending}>
                Sauvegarder
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Coffre-fort"
          description="Règle : durée de blocage (mois) et points par € par mois. Visible dans l'app (page Cagnotte)."
        >
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={onSubmitCoffreFort}
          >
            <div>
              <label className="text-xs uppercase text-ink/50">Blocage (mois)</label>
              <Input
                type="number"
                name="lockPeriodMonths"
                min={1}
                defaultValue={coffreFortQuery.data?.lockPeriodMonths ?? 2}
                key={coffreFortQuery.data?.lockPeriodMonths}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Points par € / mois</label>
              <Input
                type="number"
                name="pointsPerEuroPerMonth"
                min={0}
                step={0.5}
                defaultValue={coffreFortQuery.data?.pointsPerEuroPerMonth ?? 10}
                key={coffreFortQuery.data?.pointsPerEuroPerMonth}
              />
            </div>
            <div className="md:col-span-2 text-right">
              <Button type="submit" isLoading={updateCoffreFortMutation.isPending}>
                Sauvegarder
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Jackpot communautaire"
          description="Règles du jackpot : contributions (cashback, loterie, challenges), seuils de tirage, éligibilité, tickets par action."
        >
          <form className="grid gap-4 md:grid-cols-2" onSubmit={onSubmitJackpot}>
            <div>
              <label className="text-xs uppercase text-ink/50">% cashback → jackpot</label>
              <Input
                type="number"
                name="cashbackContributionPercent"
                min={0}
                step={0.1}
                defaultValue={jackpotConfigQuery.data?.cashbackContributionPercent ?? 0}
                key={jackpotConfigQuery.data?.cashbackContributionPercent}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Points jackpot / ticket loterie</label>
              <Input
                type="number"
                name="lotteryPointsContribution"
                min={0}
                defaultValue={jackpotConfigQuery.data?.lotteryPointsContribution ?? 0}
                key={jackpotConfigQuery.data?.lotteryPointsContribution}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Points jackpot / challenge complété</label>
              <Input
                type="number"
                name="challengePointsContribution"
                min={0}
                defaultValue={jackpotConfigQuery.data?.challengePointsContribution ?? 0}
                key={jackpotConfigQuery.data?.challengePointsContribution}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Seuil achats partenaires (€) pour tirage</label>
              <Input
                type="number"
                name="globalPartnerPurchaseAmountThreshold"
                min={0}
                defaultValue={jackpotConfigQuery.data?.globalPartnerPurchaseAmountThreshold ?? 10000}
                key={jackpotConfigQuery.data?.globalPartnerPurchaseAmountThreshold}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Seuil actions pour tirage</label>
              <Input
                type="number"
                name="globalActionsThreshold"
                min={0}
                defaultValue={jackpotConfigQuery.data?.globalActionsThreshold ?? 2000}
                key={jackpotConfigQuery.data?.globalActionsThreshold}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Date max tirage (optionnel)</label>
              <Input
                type="datetime-local"
                name="maxDrawDate"
                defaultValue={
                  jackpotConfigQuery.data?.maxDrawDate
                    ? new Date(jackpotConfigQuery.data.maxDrawDate).toISOString().slice(0, 16)
                    : ''
                }
                key={jackpotConfigQuery.data?.maxDrawDate ?? 'none'}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Min actions / user (éligibilité)</label>
              <Input
                type="number"
                name="minActionsPerUser"
                min={0}
                defaultValue={jackpotConfigQuery.data?.minActionsPerUser ?? 1}
                key={jackpotConfigQuery.data?.minActionsPerUser}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Min achats partenaires / user (optionnel)</label>
              <Input
                type="number"
                name="minPartnerPurchasesPerUser"
                min={0}
                defaultValue={jackpotConfigQuery.data?.minPartnerPurchasesPerUser ?? ''}
                key={jackpotConfigQuery.data?.minPartnerPurchasesPerUser ?? 'empty'}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Tickets participation gratuite</label>
              <Input
                type="number"
                name="freeParticipationTickets"
                min={0}
                defaultValue={jackpotConfigQuery.data?.freeParticipationTickets ?? 1}
                key={jackpotConfigQuery.data?.freeParticipationTickets}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Tickets / achat partenaire</label>
              <Input
                type="number"
                name="partnerPurchaseTickets"
                min={0}
                defaultValue={jackpotConfigQuery.data?.partnerPurchaseTickets ?? 5}
                key={jackpotConfigQuery.data?.partnerPurchaseTickets}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Tickets / ticket loterie</label>
              <Input
                type="number"
                name="lotteryTicketTickets"
                min={0}
                defaultValue={jackpotConfigQuery.data?.lotteryTicketTickets ?? 2}
                key={jackpotConfigQuery.data?.lotteryTicketTickets}
              />
            </div>
            <div>
              <label className="text-xs uppercase text-ink/50">Tickets / challenge complété</label>
              <Input
                type="number"
                name="challengeCompletionTickets"
                min={0}
                defaultValue={jackpotConfigQuery.data?.challengeCompletionTickets ?? 2}
                key={jackpotConfigQuery.data?.challengeCompletionTickets}
              />
            </div>
            <div className="md:col-span-2 text-right">
              <Button type="submit" isLoading={updateJackpotMutation.isPending}>
                Sauvegarder
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <Card title="Logs d'audit" description="Traçabilité des actions critiques">
        <div className="space-y-3">
          {(auditQuery.data ?? []).map((log) => (
            <div key={log.id} className="rounded-2xl border border-ink/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{log.actor}</p>
                <p className="text-xs text-ink/40">{formatDate(log.createdAt)}</p>
              </div>
              <p className="text-sm text-ink/70">{log.action}</p>
              <p className="text-xs text-ink/50">{log.metadata}</p>
            </div>
          ))}
          {!auditQuery.data?.length && <p className="text-sm text-ink/50">Aucun log disponible.</p>}
        </div>
      </Card>
    </div>
  );
};


