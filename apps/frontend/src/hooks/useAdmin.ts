import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import type { Skill, PaginatedResponse } from '@1hrlearning/shared';

interface AdminStats {
  stats: {
    totalUsers: number;
    totalSkills: number;
    totalUserSkills: number;
    totalSessions: number;
  };
  categoryBreakdown: { category: string; count: number }[];
  recentUsers: {
    id: string;
    username: string;
    displayName: string;
    email: string;
    role: string;
    createdAt: string;
  }[];
  recentSkills: {
    id: string;
    name: string;
    category: string;
    userCount: number;
    createdAt: string;
  }[];
}

interface AdminUser {
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

interface AdminCategory {
  name: string;
  skillCount: number;
}

export type { AdminCategory };

interface CreateSkillInput {
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  isApproved?: boolean;
}

interface UpdateSkillInput extends Partial<CreateSkillInput> {}

export function useAdminDashboard() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => api.get<AdminStats>('/admin/dashboard', accessToken ?? undefined),
    staleTime: 60 * 1000,
  });
}

export function useAdminSkills(params?: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'skills', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      return api.get<PaginatedResponse<Skill>>(`/admin/skills${qs ? `?${qs}` : ''}`, accessToken ?? undefined);
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminCreateSkill() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (input: CreateSkillInput) =>
      api.post<Skill>('/admin/skills', input, accessToken ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useAdminUpdateSkill() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSkillInput }) =>
      api.put<Skill>(`/admin/skills/${id}`, input, accessToken ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useAdminDeleteSkill() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/admin/skills/${id}`, accessToken ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
  });
}

export function useAdminCategories() {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'categories'],
    queryFn: () => api.get<AdminCategory[]>('/admin/categories', accessToken ?? undefined),
    staleTime: 60 * 1000,
  });
}

export function useAdminUsers(params?: {
  q?: string;
  role?: string;
  page?: number;
  limit?: number;
}) {
  const { accessToken } = useAuth();
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.role) searchParams.set('role', params.role);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      return api.get<{ data: AdminUser[]; pagination: PaginatedResponse<AdminUser>['pagination'] }>(`/admin/users${qs ? `?${qs}` : ''}`, accessToken ?? undefined);
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminUpdateUserRole() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }, accessToken ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}

export function useAdminUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/admin/users/${id}/status`, { isActive }, accessToken ?? undefined),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}
