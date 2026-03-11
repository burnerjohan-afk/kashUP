import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';
import { renderWithProviders } from '@/tests/test-utils';
import { useAuthStore } from '@/store/auth-store';

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('authenticates an admin user', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/Email professionnel/i), 'ops@kashup.com');
    await user.type(screen.getByLabelText(/Mot de passe/i), 'secret');
    await user.click(screen.getByRole('button', { name: /Se connecter/i }));

    await waitFor(() => expect(useAuthStore.getState().isAuthenticated).toBe(true));
  });
});


