import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Search, SunMoon, Sparkles } from 'lucide-react';
import { NAV_SECTIONS } from '@/app/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/app/providers/theme-provider';
import { CommandMenu } from '@/components/command-menu';

const useCurrentPage = () => {
  const location = useLocation();

  return useMemo(() => {
    for (const section of NAV_SECTIONS) {
      const found = section.items.find((item) => location.pathname.startsWith(item.path));
      if (found) return { title: found.label, section: section.title };
    }
    return { title: 'Dashboard', section: 'Pilotage' };
  }, [location.pathname]);
};

type HeaderProps = {
  onMenuClick: () => void;
};

export const Header = ({ onMenuClick }: HeaderProps) => {
  const { title, section } = useCurrentPage();
  const { toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-ink/5 bg-surface/80 px-4 py-3 backdrop-blur sm:px-6 lg:px-8 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          className="shrink-0 lg:hidden"
          onClick={onMenuClick}
          aria-label="Ouvrir le menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="min-w-0">
          <p className="truncate text-xs uppercase tracking-wide text-ink/40">{section}</p>
          <h1 className="truncate text-lg font-semibold text-ink sm:text-xl lg:text-2xl">{title}</h1>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <Input className="w-40 pl-9 lg:w-64" placeholder="Recherche (Ctrl+K)" />
        </div>
        <CommandMenu />
        <Button variant="secondary" className="hidden gap-1 text-xs sm:inline-flex" onClick={toggleTheme}>
          <SunMoon className="h-4 w-4" />
          <span className="hidden md:inline">Mode</span>
        </Button>
        <Button variant="primary" className="hidden gap-1 text-xs md:inline-flex">
          <Sparkles className="h-4 w-4" />
          <span className="hidden lg:inline">Action rapide</span>
        </Button>
      </div>
    </header>
  );
};

