import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, SunMoon, Sparkles } from 'lucide-react';
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

export const Header = () => {
  const { title, section } = useCurrentPage();
  const { toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-ink/5 bg-surface/80 px-8 py-4 backdrop-blur">
      <div>
        <p className="text-xs uppercase tracking-wide text-ink/40">{section}</p>
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <Input className="w-64 pl-9" placeholder="Recherche globale (Ctrl + K)" />
        </div>
        <CommandMenu />
        <Button variant="secondary" className="gap-1 text-xs" onClick={toggleTheme}>
          <SunMoon className="h-4 w-4" />
          Mode
        </Button>
        <Button variant="primary" className="gap-1 text-xs">
          <Sparkles className="h-4 w-4" />
          Action rapide
        </Button>
      </div>
    </header>
  );
};

