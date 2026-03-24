'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext, type AuthUser } from '@/lib/auth';
import { ApiError } from '@/lib/api-client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    role: string;
  };
}

export function useAdminAuth() {
  const { user, token, login, logout, isLoading } = useAuthContext();
  const router = useRouter();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  async function handleLogin(email: string, password: string): Promise<void> {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json()) as { success: boolean; data?: LoginResponse; message?: string };

      if (!res.ok || !data.success || !data.data) {
        throw new ApiError(res.status, data.message ?? 'Login failed');
      }

      const { accessToken, user: userData } = data.data;

      if (userData.role !== 'ADMIN') {
        throw new ApiError(403, 'Access denied. Admin role required.');
      }

      const authUser: AuthUser = {
        id: userData.id,
        email: userData.email,
        username: userData.username,
        displayName: userData.displayName,
        role: userData.role,
      };

      login(accessToken, authUser);
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  }

  function handleLogout(): void {
    logout();
    router.push('/login');
  }

  return {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    loginError,
    isLoggingIn,
    login: handleLogin,
    logout: handleLogout,
  };
}
