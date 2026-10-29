import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, fetchPaginated } from '@/lib/api-client';
import { useAuthContext } from '@/lib/auth';
import type { Skill, CreateSkillInput, UpdateSkillInput } from '@1hrlearning/shared';

export interface AdminStats {
  healthMetrics: {
    totalUsers: number;
    activeUsers7d: number;
    activeRate7d: number;
    totalSessionsCompleted: number;
    sessionsToday: number;
    noShowRate: number;
    onboardingDropOff: number;
    pointsInCirculation: number;
    openFlags: number;
  };
  topLearnerTopics: { skillId: string; name: string; _count: { userId: number } }[];
  topSharerTopics: { skillId: string; name: string; _count: { userId: number } }[];
}

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  pointsBalance: number;
  totalSessionsTaught: number;
  totalSessionsLearned: number;
  createdAt: string;
  _count: { skills: number };
}

export interface AdminCategory {
  name: string;
  skillCount: number;
}

export function useAdminDashboard() {
  const { token } = useAuthContext();
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiClient.get<AdminStats>('/admin/dashboard', token ?? undefined),
    staleTime: 60 * 1000,
    enabled: !!token,
  });
}

export function useAdminSkills(params?: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const { token } = useAuthContext();
  return useQuery({
    queryKey: ['admin', 'skills', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      return fetchPaginated<Skill>('/admin/skills', Object.fromEntries(searchParams), token ?? undefined);
    },
    staleTime: 30 * 1000,
    enabled: !!token,
  });
}

export function useAdminCreateSkill() {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();
  return useMutation({
    mutationFn: (input: CreateSkillInput) =>
      apiClient.post<Skill>('/admin/skills', input, token ?? undefined),
    onSuccess: () => {
      // Skill mutations affect both the resource list and aggregate dashboard counts.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useAdminUpdateSkill() {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSkillInput }) =>
      apiClient.put<Skill>(`/admin/skills/${id}`, input, token ?? undefined),
    onSuccess: () => {
      // Refresh list and aggregates because category and approval changes can alter dashboard totals.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useAdminDeleteSkill() {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/admin/skills/${id}`, token ?? undefined),
    onSuccess: () => {
      // Deleted records must disappear from the list and from dashboard aggregates together.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useAdminCategories() {
  const { token } = useAuthContext();
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => apiClient.get<AdminCategory[]>('/admin/categories', token ?? undefined),
    staleTime: 60 * 1000,
    enabled: !!token,
  });
}

export function useAdminUsers(params?: {
  q?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  const { token } = useAuthContext();
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.role) searchParams.set('role', params.role);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      return fetchPaginated<AdminUser>('/admin/users', Object.fromEntries(searchParams), token ?? undefined);
    },
    staleTime: 30 * 1000,
    enabled: !!token,
  });
}

export function useAdminUpdateUserRole() {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      apiClient.patch(`/admin/users/${id}/role`, { role }, token ?? undefined),
    onSuccess: () => {
      // Role changes affect the user table and may affect role-based dashboard statistics.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useAdminUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { token } = useAuthContext();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/admin/users/${id}/status`, { isActive }, token ?? undefined),
    onSuccess: () => {
      // Status changes alter both row state and active-user aggregates.
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}
