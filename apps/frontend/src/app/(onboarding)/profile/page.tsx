'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function OnboardingProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    displayName: session?.user?.name || '',
    bio: '',
    timezone: 'UTC',
  });

  if (status === 'unauthenticated') {
    return <div>Please log in first</div>;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          displayName: formData.displayName,
          bio: formData.bio,
          timezone: formData.timezone,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      // Move to next step
      router.push('/onboarding/share-side');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 1
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Step 1 of 4</span>
      </div>

      {/* Form Card */}
      <Card className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Let&apos;s start with your profile</h1>
          <p className="text-muted-foreground">
            Tell us a bit about yourself. You can always update this later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Display Name */}
          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium">
              Display Name *
            </label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="e.g., Alex Johnson"
              value={formData.displayName}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              This is how other users will see your name
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <label htmlFor="bio" className="text-sm font-medium">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              placeholder="e.g., I'm passionate about teaching JavaScript and learning Spanish"
              value={formData.bio}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed min-h-24"
            />
            <p className="text-xs text-muted-foreground">
              A short bio to help others get to know you (optional)
            </p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <label htmlFor="timezone" className="text-sm font-medium">
              Timezone
            </label>
            <select
              id="timezone"
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              disabled={isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="UTC">UTC</option>
              <option value="EST">Eastern Standard Time (EST)</option>
              <option value="CST">Central Standard Time (CST)</option>
              <option value="MST">Mountain Standard Time (MST)</option>
              <option value="PST">Pacific Standard Time (PST)</option>
              <option value="GMT">Greenwich Mean Time (GMT)</option>
              <option value="CET">Central European Time (CET)</option>
              <option value="IST">Indian Standard Time (IST)</option>
              <option value="JST">Japan Standard Time (JST)</option>
              <option value="AEST">Australian Eastern Standard Time (AEST)</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Your timezone helps us show availability times correctly
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-6">
            <Link href="/dashboard">
              <Button variant="outline" disabled={isLoading}>
                Skip for now
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
