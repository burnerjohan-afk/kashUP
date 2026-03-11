import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { NotificationTemplate } from '@/types/entities';
import {
  fetchNotificationTemplates,
  notificationFormSchema,
  sendNotification,
} from '../api';
import type { NotificationFormInput } from '../api';
import { formatDate } from '@/lib/utils/format';

export const NotificationsPage = () => {
  const templatesQuery = useQuery({
    queryKey: ['notification-templates'],
    queryFn: fetchNotificationTemplates,
  });

  const form = useForm<NotificationFormInput>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      templateId: '',
      audience: 'all',
      segment: '',
      sendAt: '',
    },
  });

  const mutation = useMutation({
    mutationFn: sendNotification,
    onSuccess: () => toast.success('Notification planifiée'),
    onError: () => toast.error('Impossible de déclencher la notification'),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card title="Templates" description="Gestion templates, ciblage segmenté, suivi lecture">
        <div className="space-y-3">
          {(templatesQuery.data ?? []).map((template) => (
            <TemplateRow key={template.id} template={template} />
          ))}
        </div>
      </Card>

      <Card title="Envoyer / planifier" description="POST /me/notifications">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            void form.handleSubmit((values) => {
              void mutation.mutate(values);
            })(event);
          }}
        >
          <Select {...form.register('templateId')}>
            <option value="">Choisir un template</option>
            {(templatesQuery.data ?? []).map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>
          <Select {...form.register('audience')}>
            <option value="all">Tous les utilisateurs</option>
            <option value="active">Actifs 30j</option>
            <option value="dormant">Dormants 60j</option>
            <option value="kyc_pending">KYC en attente</option>
          </Select>
          <Input placeholder="Segment additionnel (tag Powens…)" {...form.register('segment')} />
          <Input type="datetime-local" {...form.register('sendAt')} />
          <Button type="submit" isLoading={mutation.isPending}>
            Envoyer
          </Button>
        </form>
      </Card>
    </div>
  );
};

const TemplateRow = ({ template }: { template: NotificationTemplate }) => (
  <div className="rounded-2xl border border-ink/5 p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="font-semibold text-ink">{template.name}</p>
        <p className="text-xs uppercase text-ink/40">{template.channel}</p>
      </div>
      <Badge tone="muted">{template.audience}</Badge>
    </div>
    <p className="text-xs text-ink/40">MAJ {formatDate(template.updatedAt)}</p>
  </div>
);

