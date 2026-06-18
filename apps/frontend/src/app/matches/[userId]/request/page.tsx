'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';
import type { Skill, User } from '@1hrlearning/shared';

const DURATIONS = [30, 60, 90, 120];
const DEPTH_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export default function SendRequestPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const userId = params.userId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [sharer, setSharer] = useState<User | null>(null);
  const [sharableSkills, setSharableSkills] = useState<Skill[]>([]);

  const [formData, setFormData] = useState({
    skillId: '',
    durationMinutes: 60,
    depthLevel: 'BEGINNER',
    agenda: '',
    scheduledAt: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sharer profile
        const userData = await api.get<User>(`/users/${userId}`, session?.accessToken as string);
        setSharer(userData);

        // Fetch sharer's skills they teach
        try {
          const skillsData = await api.get<Skill[]>(`/skills?userId=${userId}&teaching=true`, session?.accessToken as string);
          setSharableSkills(Array.isArray(skillsData) ? skillsData : []);
        } catch {
          // Skills endpoint might return different format
          setSharableSkills([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (session?.accessToken && status === 'authenticated') {
      fetchData();
    }
  }, [session?.accessToken, status, userId]);

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="text-center">
          <p className="mb-4">Please log in to send a session request</p>
          <Link href="/login">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.skillId || !formData.scheduledAt) {
        throw new Error('Please select a skill and schedule time');
      }

      await api.post(
        '/sessions/request',
        {
          sharerId: userId,
          skillId: formData.skillId,
          scheduledAt: new Date(formData.scheduledAt).toISOString(),
          durationMinutes: formData.durationMinutes,
          depthLevel: formData.depthLevel,
          agenda: formData.agenda || undefined,
        },
        session?.accessToken as string
      );

      router.push(`/sessions`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="text-center text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Link href={`/profile/${sharer?.id}`} className="text-sm text-primary hover:underline mb-4 inline-block">
        ← Back to profile
      </Link>

      <Card className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Request a Learning Session</h1>
          <p className="text-muted-foreground">
            Request a specific time to learn from {sharer?.displayName}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 mb-6">
            {error}
          </div>
        )}

        {/* Sharer info */}
        {sharer && (
          <div className="bg-muted/50 rounded-lg p-4 mb-6 flex items-center gap-4">
            <Avatar className="w-12 h-12">
              {sharer.avatarUrl && <img src={sharer.avatarUrl} alt={sharer.displayName} />}
            </Avatar>
            <div>
              <div className="font-semibold">{sharer.displayName}</div>
              {sharer.bio && <p className="text-sm text-muted-foreground line-clamp-1">{sharer.bio}</p>}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Skill selection */}
          <div className="space-y-2">
            <label htmlFor="skillId" className="text-sm font-medium">
              What would you like to learn? *
            </label>
            <select
              id="skillId"
              name="skillId"
              value={formData.skillId}
              onChange={(e) => setFormData({ ...formData, skillId: e.target.value })}
              disabled={isLoading || sharableSkills.length === 0}
              required
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select a skill...</option>
              {sharableSkills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {skill.name}
                </option>
              ))}
            </select>
          </div>

          {/* Depth level */}
          <div className="space-y-2">
            <label htmlFor="depthLevel" className="text-sm font-medium">
              Your experience level
            </label>
            <select
              id="depthLevel"
              name="depthLevel"
              value={formData.depthLevel}
              onChange={(e) => setFormData({ ...formData, depthLevel: e.target.value })}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {DEPTH_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <label htmlFor="duration" className="text-sm font-medium">
              Session duration (minutes)
            </label>
            <select
              id="duration"
              name="duration"
              value={formData.durationMinutes}
              onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {DURATIONS.map((duration) => (
                <option key={duration} value={duration}>
                  {duration} minutes
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled time */}
          <div className="space-y-2">
            <label htmlFor="scheduledAt" className="text-sm font-medium">
              When would you like to start? *
            </label>
            <input
              id="scheduledAt"
              name="scheduledAt"
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              disabled={isLoading}
              required
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Agenda */}
          <div className="space-y-2">
            <label htmlFor="agenda" className="text-sm font-medium">
              Session agenda (optional)
            </label>
            <textarea
              id="agenda"
              name="agenda"
              placeholder="What would you like to cover in this session?"
              value={formData.agenda}
              onChange={(e) => setFormData({ ...formData, agenda: e.target.value })}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-20 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-6">
            <Link href={`/profile/${userId}`} className="flex-1">
              <Button variant="outline" className="w-full" disabled={isLoading}>
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || sharableSkills.length === 0}
            >
              {isLoading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
