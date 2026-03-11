import { useId, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { login, loginSchema } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { ApiError } from '@/lib/api/response';
import { testApiConnection, logApiConfig } from '@/utils/test-api-connection';

type LoginFields = z.infer<typeof loginSchema>;

export const LoginForm = () => {
  const { setCredentials, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const emailId = useId();
  const passwordId = useId();
  const [apiTested, setApiTested] = useState(false);

  const form = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Tester la connexion à l'API au chargement du composant
  useEffect(() => {
    if (!apiTested && import.meta.env.DEV) {
      // Afficher la configuration API
      logApiConfig();
      
      // Tester la connexion
      testApiConnection().then((result) => {
        setApiTested(true);
        if (!result.accessible) {
          const errorMsg = result.error 
            ? `Erreur: ${result.error}`
            : 'Vérifiez que l\'API backend est démarrée et accessible.';
          
          toast.error(
            `API non accessible. ${errorMsg}`,
            { duration: 8000 }
          );
          
          console.error('❌ Détails de l\'erreur de connexion:', {
            accessible: result.accessible,
            error: result.error,
            responseTime: result.responseTime,
            details: result.details,
          });
        } else {
          console.log('✅ API accessible:', {
            status: result.status,
            responseTime: `${result.responseTime}ms`,
          });
        }
      });
    }
  }, [apiTested]);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (payload) => {
      setCredentials(payload);
      toast.success('Connexion réussie');
    },
    onError: (error) => {
      // Afficher le message d'erreur réel avec plus de détails
      let errorMessage = 'Échec de connexion';
      
      if (error instanceof ApiError) {
        errorMessage = error.message || 'Identifiants invalides';
      } else if (error instanceof Error) {
        // Gérer les erreurs de réseau
        if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('contacter')) {
          errorMessage = 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée et accessible sur http://localhost:4000';
        } else if (error.message.includes('Identifiants invalides') || error.message.includes('invalid') || error.message.includes('401')) {
          errorMessage = 'Identifiants invalides. Vérifiez votre email et votre mot de passe.';
        } else {
          errorMessage = error.message || 'Erreur de connexion';
        }
      }
      
      toast.error(errorMessage, { duration: 5000 });
      
      // Log détaillé en développement
      if (import.meta.env.DEV) {
        console.error('❌ Erreur de connexion complète:', {
          error,
          errorType: error?.constructor?.name,
          errorMessage: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    },
  });

  // Navigation après succès de la connexion (dans un useEffect pour éviter les problèmes de re-render)
  useEffect(() => {
    if (mutation.isSuccess && isAuthenticated) {
      // Utiliser setTimeout pour s'assurer que le state est bien mis à jour
      const timer = setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [mutation.isSuccess, isAuthenticated, navigate]);

  const onSubmit = (values: LoginFields) => {
    mutation.mutate(values);
  };

  const errorMessage = mutation.isError
    ? mutation.error instanceof ApiError
      ? mutation.error.message
      : mutation.error instanceof Error &&
        (mutation.error.message.includes('fetch') ||
          mutation.error.message.includes('network') ||
          mutation.error.message.includes('contacter'))
      ? 'Impossible de contacter le serveur. Vérifiez que l\'API backend est démarrée.'
      : 'Erreur de connexion. Vérifiez vos identifiants.'
    : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit(onSubmit)(event);
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor={emailId} className="text-sm font-medium text-ink">
          Email professionnel
        </label>
        <Input id={emailId} type="email" {...form.register('email')} placeholder="ops@kashup.com" />
        {form.formState.errors.email && (
          <p className="text-xs text-warning">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <label htmlFor={passwordId} className="text-sm font-medium text-ink">
          Mot de passe
        </label>
        <Input
          id={passwordId}
          type="password"
          {...form.register('password')}
          placeholder="********"
        />
        {form.formState.errors.password && (
          <p className="text-xs text-warning">{form.formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" isLoading={mutation.isPending}>
        Se connecter
      </Button>
      {errorMessage && (
        <p className="text-xs text-center text-warning" key="error-message">
          {errorMessage}
        </p>
      )}
    </form>
  );
};

