import { useId } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { passwordResetSchema, requestPasswordReset } from '../api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type PasswordResetFields = z.infer<typeof passwordResetSchema>;

export const PasswordResetForm = () => {
  const form = useForm<PasswordResetFields>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  });
  const emailId = useId();

  const mutation = useMutation({
    mutationFn: requestPasswordReset,
    onSuccess: () => toast.success('Email de réinitialisation envoyé'),
    onError: () => toast.error('Impossible d’envoyer le lien'),
  });

  const onSubmit = (values: PasswordResetFields) => {
    mutation.mutate(values);
  };

  return (
    <form
      onSubmit={(event) => {
        void form.handleSubmit(onSubmit)(event);
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor={emailId} className="text-sm font-medium text-ink">
          Email
        </label>
        <Input id={emailId} type="email" {...form.register('email')} placeholder="ops@kashup.com" />
        {form.formState.errors.email && (
          <p className="text-xs text-warning">{form.formState.errors.email.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        Envoyer le lien
      </Button>
    </form>
  );
};

