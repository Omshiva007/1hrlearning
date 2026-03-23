'use client';

import { useSession, signOut } from 'next-auth/react';
import { useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const { data: session, status } = useSession();
  const { setUser, clearUser } = useAuthStore();

  const logout = useCallback(async () => {
    clearUser();
    await signOut({ callbackUrl: '/' });
  }, [clearUser]);

  const isAuthenticated = status === 'authenticated' && !!session;
  const isLoading = status === 'loading';

  return {
    session,
    user: session?.user,
    accessToken: session?.accessToken,
    isAuthenticated,
    isLoading,
    logout,
  };
}
