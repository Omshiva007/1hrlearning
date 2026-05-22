'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import Link from 'next/link';

interface Skill {
  id: string;
  name: string;
  category: string;
}

interface User {
  id: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
}

interface Availability {
  id: string;
  startTime: string;
  endTime: string;
}

const DEPTH_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

export default function SendInterestPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const userId = params.userId as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState('');
  const [sharer, setSharer] = useState<User | null>(null);
  const [sharableSkills, setSharableSkills] = useState<Skill[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);

  const [formData, setFormData] = useState({
    skillId: '',
    availabilityId: '',
    depthLevel: 'BEGINNER',
    message: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch sharer profile
        const userRes = await fetch(`/api/v1/users/${userId}`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (!userRes.ok) throw new Error('Failed to load sharer profile');
        const userData = await userRes.json();
        setSharer(userData.data);

        // Fetch sharer's skills they teach
        const skillsRes = await fetch(`/api/v1/skills?userId=${userId}&teaching=true`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (skillsRes.ok) {
          const skillsData = await skillsRes.json();
          setSharableSkills(skillsData.data || []);
        }

        // Fetch sharer's availability
        const availRes = await fetch(`/api/v1/availability/${userId}`, {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        });
        if (availRes.ok) {
          const availData = await availRes.json();
          setAvailabilities(availData.data || []);
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
          <p className="mb-4">Please log in to send interest</p>
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
      if (!formData.skillId || !formData.availabilityId) {
        throw new Error('Please select a skill and availability slot');
      }

      const response = await fetch('/api/v1/sessions/interest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          sharerId: userId,
          skillId: formData.skillId,
          availabilityId: formData.availabilityId,
          depthLevel: formData.depthLevel,
          message: formData.message || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to send interest');
      }

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
          <h1 className="text-2xl font-bold mb-2">Express Interest to Learn</h1>
          <p className="text-muted-foreground">
            Send {sharer?.displayName} a request to learn from them
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
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
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
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            >
              {DEPTH_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          </div>

          {/* Availability selection */}
          <div className="space-y-2">
            <label htmlFor="availabilityId" className="text-sm font-medium">
              Select a time slot *
            </label>
            <select
              id="availabilityId"
              name="availabilityId"
              value={formData.availabilityId}
              onChange={(e) => setFormData({ ...formData, availabilityId: e.target.value })}
              disabled={isLoading || availabilities.length === 0}
              required
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            >
              <option value="">Select a time slot...</option>
              {availabilities.map((avail) => {
                const start = new Date(avail.startTime);
                const end = new Date(avail.endTime);
                return (
                  <option key={avail.id} value={avail.id}>
                    {start.toLocaleDateString()} {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-medium">
              Message (optional)
            </label>
            <textarea
              id="message"
              name="message"
              placeholder="Tell {sharer?.displayName} a bit about yourself and why you're interested..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 min-h-24"
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
              disabled={isLoading || sharableSkills.length === 0 || availabilities.length === 0}
            >
              {isLoading ? 'Sending...' : 'Send Interest'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
