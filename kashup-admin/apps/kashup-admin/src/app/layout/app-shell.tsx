import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Header } from './header';

export const AppShell = () => (
  <div className="flex min-h-screen bg-muted">
    <Sidebar />
    <div className="ml-72 flex flex-1 flex-col">
      <Header />
      <main className="flex-1 px-8 py-6">
        <Outlet />
      </main>
    </div>
  </div>
);

