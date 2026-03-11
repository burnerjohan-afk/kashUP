import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/app/layout/app-shell';
import { ProtectedRoute } from './protected-route';
import { LoginPage } from '@/features/auth/pages/login-page';
import { PasswordResetPage } from '@/features/auth/pages/password-reset-page';
import { DashboardPage } from '@/features/dashboard/pages/dashboard-page';
import { ErrorBoundary } from '@/components/error-boundary';
import { UsersPage } from '@/features/users/pages/users-page';
import { PartnersPage } from '@/features/partners/pages/partners-page';
import { OffersPage } from '@/features/offers/pages/offers-page';
import { PartnerDetailPage } from '@/features/partners/pages/partner-detail-page';
import { RewardsPage } from '@/features/rewards/pages/rewards-page';
import { GiftCardsPage } from '@/features/gift-cards/pages/gift-cards-page';
import { DonationsPage } from '@/features/donations/pages/donations-page';
import { NotificationsPage } from '@/features/notifications/pages/notifications-page';
import { PowensPage } from '@/features/powens/pages/powens-page';
import { DrimifyPage } from '@/features/drimify/pages/drimify-page';
import { TransactionsPage } from '@/features/transactions/pages/transactions-page';
import { WebhooksPage } from '@/features/webhooks/pages/webhooks-page';
import { SettingsPage } from '@/features/settings/pages/settings-page';
import { HomeBannersPage } from '@/features/home-banners/pages/home-banners-page';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/reset-password',
    element: <PasswordResetPage />,
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { 
            path: '/dashboard', 
            element: (
              <ErrorBoundary>
                <DashboardPage />
              </ErrorBoundary>
            )
          },
          { path: '/users', element: <UsersPage /> },
          { 
            path: '/partners', 
            element: (
              <ErrorBoundary>
                <PartnersPage />
              </ErrorBoundary>
            )
          },
          { path: '/partners/:id', element: <PartnerDetailPage /> },
          { path: '/offers', element: <OffersPage /> },
          { path: '/rewards', element: <RewardsPage /> },
          { path: '/gift-cards', element: <GiftCardsPage /> },
          { path: '/donations', element: <DonationsPage /> },
          { path: '/home-banners', element: <HomeBannersPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
          { path: '/powens', element: <PowensPage /> },
          { path: '/drimify', element: <DrimifyPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/webhooks', element: <WebhooksPage /> },
          { path: '/settings', element: <SettingsPage /> },
          { path: '*', element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

export const AppRouter = () => <RouterProvider router={router} />;


