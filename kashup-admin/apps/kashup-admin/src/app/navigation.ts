import { ComponentType } from 'react';
import {
  Activity,
  BellRing,
  Building2,
  Gamepad2,
  Gauge,
  Gift,
  HeartHandshake,
  ImageIcon,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users2,
  Workflow,
} from 'lucide-react';
import type { UserRole } from '@/types/auth';

export type AppNavItem = {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  roles: UserRole[];
};

export type AppNavSection = {
  title: string;
  items: AppNavItem[];
};

export const NAV_SECTIONS: AppNavSection[] = [
  {
    title: 'Pilotage',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        roles: ['admin', 'support', 'partner_manager'],
      },
      {
        label: 'Transactions & Compliance',
        path: '/transactions',
        icon: ShieldCheck,
        roles: ['admin', 'support'],
      },
      {
        label: 'Webhooks & Monitoring',
        path: '/webhooks',
        icon: Activity,
        roles: ['admin'],
      },
    ],
  },
  {
    title: 'Écosystème',
    items: [
      {
        label: 'Utilisateurs & Wallets',
        path: '/users',
        icon: Users2,
        roles: ['admin', 'support'],
      },
      {
        label: 'Partenaires',
        path: '/partners',
        icon: Building2,
        roles: ['admin', 'partner_manager'],
      },
      {
        label: 'Offres',
        path: '/offers',
        icon: Sparkles,
        roles: ['admin', 'partner_manager'],
      },
      {
        label: 'Rewards & Expériences',
        path: '/rewards',
        icon: Gamepad2,
        roles: ['admin', 'partner_manager'],
      },
      {
        label: 'Gift Cards & Boxes',
        path: '/gift-cards',
        icon: Gift,
        roles: ['admin', 'partner_manager'],
      },
      {
        label: 'Dons',
        path: '/donations',
        icon: HeartHandshake,
        roles: ['admin', 'partner_manager'],
      },
      {
        label: 'Publicité accueil',
        path: '/home-banners',
        icon: ImageIcon,
        roles: ['admin', 'partner_manager'],
      },
    ],
  },
  {
    title: 'Engagement',
    items: [
      {
        label: 'Notifications',
        path: '/notifications',
        icon: BellRing,
        roles: ['admin', 'support'],
      },
      {
        label: 'Powens',
        path: '/powens',
        icon: Gauge,
        roles: ['admin', 'support'],
      },
      {
        label: 'Drimify',
        path: '/drimify',
        icon: Gamepad2,
        roles: ['admin', 'partner_manager'],
      },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Paramètres',
        path: '/settings',
        icon: Workflow,
        roles: ['admin'],
      },
    ],
  },
];

