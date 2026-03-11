import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { NAV_SECTIONS } from '@/app/navigation';
import { usePermissions } from '@/lib/hooks/use-permissions';

export const CommandMenu = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { hasRole } = usePermissions();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSelect = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-3 py-1 text-xs font-medium text-ink/70 shadow-soft transition hover:border-primary"
        >
          <Search className="h-3.5 w-3.5" />
          Cmd + K
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/4 w-full max-w-2xl -translate-x-1/2 rounded-2xl bg-white p-4 shadow-soft">
          <Command label="Navigation KashUP" className="space-y-2">
            <Command.Input placeholder="Aller vers…" className="w-full border-none text-base focus:outline-none" />
            <Command.List className="max-h-96 overflow-y-auto">
              {NAV_SECTIONS.map((section) => (
                <Command.Group key={section.title} heading={section.title}>
                  {section.items
                    .filter((item) => hasRole(item.roles))
                    .map((item) => (
                      <Command.Item
                        key={item.path}
                        value={item.path}
                        onSelect={() => handleSelect(item.path)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-2 aria-selected:bg-primary/10"
                      >
                        <span className="text-sm">{item.label}</span>
                        <span className="text-xs text-ink/40">{item.path}</span>
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

