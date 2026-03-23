import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@1hrlearning/shared';

interface AuthState {
  user: Partial<User> | null;
  setUser: (user: Partial<User>) => void;
  clearUser: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : updates,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
