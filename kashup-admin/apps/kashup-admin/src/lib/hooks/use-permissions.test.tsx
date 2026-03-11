import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from './use-permissions';
import { useAuthStore } from '@/store/auth-store';

describe('usePermissions', () => {
beforeEach(() => {
  useAuthStore.setState({
    accessToken: undefined,
    refreshToken: undefined,
    user: undefined,
    roles: [],
    isAuthenticated: false,
  });
});

  it('returns true when role is available', () => {
    useAuthStore.setState({ roles: ['support'] });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.hasRole('support')).toBe(true);
    expect(result.current.roleBadgeTone).toBe('muted');
  });

  it('detects admin tone priority', () => {
    useAuthStore.setState({ roles: ['admin', 'support'] });
    const { result } = renderHook(() => usePermissions());
    expect(result.current.roleBadgeTone).toBe('primary');
  });
});


