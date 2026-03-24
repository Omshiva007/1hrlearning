'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from './useAuth';
import type { Skill, UserSkill, PaginatedResponse } from '@1hrlearning/shared';
import type { AddUserSkillInput, UpdateUserSkillInput } from '@1hrlearning/shared';

export function useSkills(params?: {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['skills', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.set('q', params.q);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.page) searchParams.set('page', String(params.page));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      return api.get<PaginatedResponse<Skill>>(`/skills${qs ? `?${qs}` : ''}`);
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSkill(id: string) {
  return useQuery({
    queryKey: ['skills', id],
    queryFn: () => api.get<Skill>(`/skills/${id}`),
    enabled: !!id,
  });
}

export function useUserSkills(userId: string) {
  return useQuery({
    queryKey: ['users', userId, 'skills'],
    queryFn: () => api.get<UserSkill[]>(`/users/${userId}/skills`),
    enabled: !!userId,
  });
}

export function useAddUserSkill(userId: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: (input: AddUserSkillInput) =>
      api.post<UserSkill>(`/users/${userId}/skills`, input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId, 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

export function useUpdateUserSkill(userId: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: ({ skillId, input }: { skillId: string; input: UpdateUserSkillInput }) =>
      api.put<UserSkill>(`/users/${userId}/skills/${skillId}`, input, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId, 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}

export function useRemoveUserSkill(userId: string) {
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();

  return useMutation({
    mutationFn: (skillId: string) =>
      api.delete(`/users/${userId}/skills/${skillId}`, accessToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users', userId, 'skills'] });
      void queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    },
  });
}
