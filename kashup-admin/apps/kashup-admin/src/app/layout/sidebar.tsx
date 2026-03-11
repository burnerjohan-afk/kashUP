import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_SECTIONS } from '@/app/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils/cn';

const NavItem = ({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}) => (
  <NavLink
    to={to}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-primary/10 hover:text-primary',
        isActive && 'bg-primary text-white shadow-soft hover:bg-primary',
      )
    }
  >
    <Icon className="h-4 w-4" />
    {label}
  </NavLink>
);

export const Sidebar = () => {
  const { hasRole } = usePermissions();
  const { user, clearSession } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-72 flex-col border-r border-ink/5 bg-surface p-6 shadow-soft">
      <div className="mb-8">
        <div className="text-lg font-bold text-primary">KashUP Admin</div>
        <p className="text-sm text-ink/60">Pilotage écosystème & compliance</p>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto pr-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-2 text-xs font-semibold uppercase text-ink/40">{section.title}</p>
            <div className="space-y-1">
              {section.items
                .filter((item) => hasRole(item.roles))
                .map((item) => (
                  <NavItem key={item.path} to={item.path} label={item.label} icon={item.icon} />
                ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-8 rounded-2xl border border-ink/5 bg-muted p-4">
        <p className="text-xs text-ink/50">Connecté en tant que</p>
        <p className="text-sm font-semibold text-ink">{user?.fullName}</p>
        <Badge tone="primary" className="mt-2 capitalize">
          {user?.role ?? 'admin'}
        </Badge>
        <button
          onClick={clearSession}
          className="mt-4 text-sm font-medium text-primary hover:text-primary-hover"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
};

