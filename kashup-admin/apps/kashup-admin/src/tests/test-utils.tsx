import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/locales';
import { ThemeProvider } from '@/app/providers/theme-provider';

type ProvidersOptions = {
  queryClient?: QueryClient;
} & Omit<RenderOptions, 'wrapper'>;

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const Providers = ({
  children,
  client,
}: {
  children: ReactNode;
  client: QueryClient;
}) => (
  <I18nextProvider i18n={i18n}>
    <ThemeProvider>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  </I18nextProvider>
);

export const renderWithProviders = (ui: ReactElement, options?: ProvidersOptions) => {
  const queryClient = options?.queryClient ?? createTestClient();
  return {
    queryClient,
    ...render(ui, {
      wrapper: ({ children }) => <Providers client={queryClient}>{children}</Providers>,
      ...options,
    }),
  };
};


