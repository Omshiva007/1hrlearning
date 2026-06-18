'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { api, fetchPaginated } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Skill } from '@1hrlearning/shared';

export default function OnboardingShareSidePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const result = await fetchPaginated<Skill>('/skills', { limit: 100 }, session?.accessToken as string);
        setSkills(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load skills');
      } finally {
        setIsLoadingSkills(false);
      }
    };

    if (session?.accessToken) {
      fetchSkills();
    }
  }, [session?.accessToken]);

  if (status === 'unauthenticated') {
    return <div>Please log in first</div>;
  }

  const filteredSkills = skills.filter((skill) =>
    skill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    skill.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSkillToggle = (skillId: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId)
        ? prev.filter((id) => id !== skillId)
        : [...prev, skillId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Add selected skills as teaching skills
      const promises = selectedSkills.map((skillId) =>
        api.post(
          `/users/skills/${skillId}`,
          {
            isTeaching: true,
            proficiency: 'EXPERT',
          },
          session?.accessToken as string
        )
      );

      await Promise.all(promises);

      // Move to next step
      router.push('/onboarding/learn-side');
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
                step <= 2
                  ? step === 2
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step < 2 ? '✓' : step}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Step 2 of 4</span>
      </div>

      {/* Form Card */}
      <Card className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">What can you teach?</h1>
          <p className="text-muted-foreground">
            Select the skills you'd like to share with others. Don't worry, you can add more later!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Search box */}
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isLoadingSkills || isLoading}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Skills grid */}
          {isLoadingSkills ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading skills...
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-2">
              {filteredSkills.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No skills found
                </div>
              ) : (
                filteredSkills.map((skill) => (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => handleSkillToggle(skill.id)}
                    disabled={isLoading}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedSkills.includes(skill.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-muted bg-muted/30 hover:border-muted-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="font-medium text-sm">{skill.name}</div>
                    <div className="text-xs text-muted-foreground">{skill.category}</div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Selected skills preview */}
          {selectedSkills.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Selected ({selectedSkills.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map((skillId) => {
                  const skill = skills.find((s) => s.id === skillId);
                  return skill ? (
                    <Badge key={skillId} variant="secondary">
                      {skill.name}
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-6">
            <Link href="/onboarding/profile">
              <Button variant="outline" disabled={isLoading}>
                Back
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || selectedSkills.length === 0}
            >
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
