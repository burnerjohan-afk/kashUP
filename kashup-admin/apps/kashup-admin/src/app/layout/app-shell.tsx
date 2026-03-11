import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';

export const AppShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-muted">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onOpenChange={setSidebarOpen} />
      <div className="flex min-w-0 flex-1 flex-col lg:ml-72">
        <Header onMenuClick={() => setSidebarOpen((v) => !v)} />
        <main className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

