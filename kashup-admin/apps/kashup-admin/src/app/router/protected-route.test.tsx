import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from './protected-route';
import { useAuthStore } from '@/store/auth-store';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('redirects anonymous users to login', () => {
    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/secure" element={<ProtectedRoute />}>
            <Route index element={<div>Zone sécurisée</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Login page/i)).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    useAuthStore.setState({ isAuthenticated: true });

    render(
      <MemoryRouter initialEntries={['/secure']}>
        <Routes>
          <Route path="/secure" element={<ProtectedRoute />}>
            <Route index element={<div>Zone sécurisée</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Zone sécurisée/i)).toBeInTheDocument();
  });
});


