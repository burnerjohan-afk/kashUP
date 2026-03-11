import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { NAV_SECTIONS } from '@/app/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { useAuthStore } from '@/store/auth-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

const NavItem = ({
  to,
  label,
  icon: Icon,
  onClick,
}: {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onClick?: () => void;
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink/70 transition hover:bg-primary/10 hover:text-primary',
        isActive && 'bg-primary text-white shadow-soft hover:bg-primary',
      )
    }
  >
    <Icon className="h-4 w-4 shrink-0" />
    <span className="truncate">{label}</span>
  </NavLink>
);

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
};

export const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { hasRole } = usePermissions();
  const { user, clearSession } = useAuthStore();

  return (
    <>
      {/* Backdrop mobile / tablette */}
      <button
        type="button"
        aria-label="Fermer le menu"
        className={cn(
          'fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-72 max-w-[85vw] flex-col border-r border-ink/5 bg-surface shadow-soft transition-transform duration-200 ease-out lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-ink/5 p-4 lg:border-0 lg:p-6 lg:pb-0">
          <div className="min-w-0">
            <div className="text-lg font-bold text-primary">KashUP Admin</div>
            <p className="truncate text-sm text-ink/60">Pilotage écosystème & compliance</p>
          </div>
          <Button
            variant="ghost"
            className="shrink-0 lg:hidden"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-6 lg:pt-6 pr-2">
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase text-ink/40">{section.title}</p>
              <div className="space-y-1">
                {section.items
                  .filter((item) => hasRole(item.roles))
                  .map((item) => (
                    <NavItem key={item.path} to={item.path} label={item.label} icon={item.icon} onClick={onClose} />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-ink/5 p-4 lg:mx-4 lg:mt-4 lg:rounded-2xl lg:border lg:bg-muted lg:p-4">
          <p className="text-xs text-ink/50">Connecté en tant que</p>
          <p className="truncate text-sm font-semibold text-ink">{user?.fullName}</p>
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
    </>
  );
};

