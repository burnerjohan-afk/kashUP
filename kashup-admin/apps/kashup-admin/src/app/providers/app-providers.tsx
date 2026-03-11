import { ReactNode, Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { I18nextProvider } from 'react-i18next';
import { Toaster } from 'sonner';
import { queryClient } from './query-client';
import { ThemeProvider } from './theme-provider';
import { SessionWarning } from '@/lib/auth/session-manager';
import i18n from '@/locales';

type AppProvidersProps = {
  children: ReactNode;
};

export const AppProviders = ({ children }: AppProvidersProps) => (
  <I18nextProvider i18n={i18n}>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<div className="p-4 text-sm">Chargement…</div>}>
          {children}
        </Suspense>
        <Toaster richColors position="top-right" />
        <ReactQueryDevtools initialIsOpen={false} />
        <SessionWarning />
      </QueryClientProvider>
    </ThemeProvider>
  </I18nextProvider>
);

