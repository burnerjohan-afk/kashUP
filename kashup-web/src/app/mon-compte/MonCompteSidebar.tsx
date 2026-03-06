'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Lock,
  Leaf,
  Receipt,
  Star,
  Gift,
  Heart,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const items = [
  { label: 'Tableau de bord', href: '/mon-compte', icon: LayoutDashboard },
  { label: 'Ma cagnotte', href: '/mon-compte#cagnotte', icon: Wallet },
  { label: 'Coffre-fort', href: '/mon-compte#coffre-fort', icon: Lock },
  { label: 'Mon impact', href: '/mon-compte#impact', icon: Leaf },
  { label: 'Historique des gains', href: '/mon-compte#historique', icon: Receipt },
  { label: 'Points & récompenses', href: '/mon-compte#points', icon: Star },
  { label: "Bons d'achat", href: '/mon-compte#bons', icon: Gift },
  { label: 'Partenaires favoris', href: '/mon-compte#favoris', icon: Heart },
  { label: 'Faire un don', href: '/faire-un-don', icon: Heart },
];

export default function MonCompteSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
      <nav className="sticky top-20 flex flex-col gap-1 p-4">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.href === '/mon-compte' && pathname === '/mon-compte';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                active ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => { logout(); window.location.href = '/'; }}
          className="mt-4 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Se déconnecter
        </button>
      </nav>
    </aside>
  );
}
