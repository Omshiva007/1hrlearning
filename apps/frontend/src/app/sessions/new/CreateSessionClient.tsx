'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Skill } from '@1hrlearning/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { fetchPaginated } from '@/lib/api';

interface CreateSessionClientProps {
  token: string;
}

export function CreateSessionClient({ token }: CreateSessionClientProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    skillId: '',
    scheduledAt: '',
    durationMinutes: 60,
    notes: '',
    sessionType: 'TEACHING' as 'TEACHING' | 'QUERY_CLARIFICATION',
    isPublic: false,
    applicationDeadline: '',
    maxLearners: 1,
    learnerId: '',
    meetingUrl: undefined as string | undefined,
  });

  const skillsQuery = useQuery({
    queryKey: ['skills-list'],
    queryFn: () => fetchPaginated<Skill>('/skills', { limit: 100 }),
  });

  const profileQuery = useQuery({
    queryKey: ['my-profile-session-create'],
    queryFn: () => api.get<{ defaultMeetingUrl?: string | null }>('/auth/me', token),
  });

  const defaultMeetingUrl = profileQuery.data?.defaultMeetingUrl ?? '';

  const createMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {
        skillId: form.skillId,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMinutes: form.durationMinutes,
        notes: form.notes || null,
        sessionType: form.sessionType,
        isPublic: form.isPublic,
        maxLearners: form.maxLearners,
        meetingUrl: form.meetingUrl ?? defaultMeetingUrl ?? null,
      };
      if (form.applicationDeadline) {
        body.applicationDeadline = new Date(form.applicationDeadline).toISOString();
      }
      if (!form.isPublic && form.learnerId) {
        body.learnerId = form.learnerId;
      }
      return api.post('/sessions', body, token);
    },
    onSuccess: () => router.push('/sessions'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Skill */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Skill to Teach *</label>
            <select
              required
              value={form.skillId}
              onChange={(e) => setForm((f) => ({ ...f, skillId: e.target.value }))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a skill…</option>
              {skillsQuery.data?.data.map((skill) => (
                <option key={skill.id} value={skill.id}>{skill.name} ({skill.category})</option>
              ))}
            </select>
          </div>

          {/* Session Type */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Session Type</label>
            <div className="flex gap-3">
              {[
                { value: 'TEACHING', label: '🎓 Teaching — I will explain the topic' },
                { value: 'QUERY_CLARIFICATION', label: '💬 Q&A — Answer specific questions / clarify concepts' },
              ].map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer flex-1 border rounded-md p-3 hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="sessionType"
                    value={opt.value}
                    checked={form.sessionType === opt.value}
                    onChange={() => setForm((f) => ({ ...f, sessionType: opt.value as typeof form.sessionType }))}
                    className="accent-primary"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Date and Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Date & Time *</label>
              <Input
                type="datetime-local"
                required
                value={form.scheduledAt}
                onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Duration (minutes)</label>
              <select
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
                className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min (recommended)</option>
                <option value={90}>90 min</option>
                <option value={120}>120 min</option>
              </select>
            </div>
          </div>

          {/* Session Visibility */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Visibility</label>
            <div className="flex gap-3">
              {[
                { value: false, label: '🔒 Private — Invite a specific person' },
                { value: true, label: '🔓 Public — Anyone can apply' },
              ].map((opt) => (
                <label key={String(opt.value)} className="flex items-center gap-2 cursor-pointer flex-1 border rounded-md p-3 hover:bg-muted transition-colors">
                  <input
                    type="radio"
                    name="isPublic"
                    checked={form.isPublic === opt.value}
                    onChange={() => setForm((f) => ({ ...f, isPublic: opt.value }))}
                    className="accent-primary"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Conditional fields */}
          {!form.isPublic && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Learner Username or ID</label>
              <Input
                placeholder="e.g. johndoe"
                value={form.learnerId}
                onChange={(e) => setForm((f) => ({ ...f, learnerId: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">Enter the username or user ID of the person you want to invite.</p>
            </div>
          )}

          {form.isPublic && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Max Learners</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.maxLearners}
                  onChange={(e) => setForm((f) => ({ ...f, maxLearners: Number(e.target.value) }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Application Deadline (optional)</label>
                <Input
                  type="datetime-local"
                  value={form.applicationDeadline}
                  onChange={(e) => setForm((f) => ({ ...f, applicationDeadline: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Meeting Link *</label>
            <Input
              type="url"
              required
              placeholder="https://zoom.us/j/... or https://meet.google.com/..."
              value={form.meetingUrl ?? defaultMeetingUrl}
              onChange={(e) => setForm((f) => ({ ...f, meetingUrl: e.target.value || undefined }))}
            />
            {!defaultMeetingUrl && (
              <p className="text-xs text-amber-700 mt-1">Tip: Set a default meeting link in Settings to avoid entering this every time.</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Notes / Description (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="What will you cover? Any prerequisites? Meeting link?"
              className="w-full border rounded-md px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-primary"
              maxLength={1000}
            />
          </div>

          {createMutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              {(createMutation.error as Error).message}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creating…' : 'Create Session'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
