'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Skill {
  id: string;
  name: string;
  category: string;
}

const DEPTH_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', description: 'Just starting out' },
  { value: 'INTERMEDIATE', label: 'Intermediate', description: 'Some experience' },
  { value: 'ADVANCED', label: 'Advanced', description: 'Very experienced' },
];

export default function OnboardingLearnSidePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [error, setError] = useState('');
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<{ skillId: string; depth: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch('/api/v1/skills', {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch skills');

        const data = await response.json();
        setSkills(data.data || []);
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
    setSelectedSkills((prev) => {
      const exists = prev.find((s) => s.skillId === skillId);
      if (exists) {
        return prev.filter((s) => s.skillId !== skillId);
      } else {
        return [...prev, { skillId, depth: 'BEGINNER' }];
      }
    });
  };

  const handleDepthChange = (skillId: string, depth: string) => {
    setSelectedSkills((prev) =>
      prev.map((s) => (s.skillId === skillId ? { ...s, depth } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Add selected skills as learning skills
      const promises = selectedSkills.map(({ skillId, depth }) =>
        fetch(`/api/v1/users/skills/${skillId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            isLearning: true,
            depthLevel: depth,
          }),
        })
      );

      const responses = await Promise.all(promises);
      if (!responses.every((r) => r.ok)) {
        throw new Error('Failed to save skills');
      }

      // Move to next step
      router.push('/onboarding/availability');
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
                step <= 3
                  ? step === 3
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step < 3 ? '✓' : step}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Step 3 of 4</span>
      </div>

      {/* Form Card */}
      <Card className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">What do you want to learn?</h1>
          <p className="text-muted-foreground">
            Select the skills you'd like to learn and choose your experience level.
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
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
            />
          </div>

          {/* Skills grid */}
          {isLoadingSkills ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading skills...
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto p-2">
              {filteredSkills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No skills found
                </div>
              ) : (
                filteredSkills.map((skill) => {
                  const isSelected = selectedSkills.find((s) => s.skillId === skill.id);
                  return (
                    <div
                      key={skill.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-muted bg-muted/30 hover:border-muted-foreground'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSkillToggle(skill.id)}
                        disabled={isLoading}
                        className="w-full text-left mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded border-2 border-current flex items-center justify-center text-xs font-bold">
                            {isSelected && '✓'}
                          </div>
                          <div>
                            <div className="font-medium">{skill.name}</div>
                            <div className="text-xs text-muted-foreground">{skill.category}</div>
                          </div>
                        </div>
                      </button>

                      {isSelected && (
                        <div className="ml-7 space-y-2">
                          <label className="block text-sm font-medium">Current level:</label>
                          <div className="flex gap-2">
                            {DEPTH_LEVELS.map((level) => (
                              <button
                                key={level.value}
                                type="button"
                                onClick={() => handleDepthChange(skill.id, level.value)}
                                disabled={isLoading}
                                className={`px-3 py-1 rounded text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                                  isSelected?.depth === level.value
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground hover:bg-muted-foreground/50'
                                }`}
                              >
                                {level.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Selected skills preview */}
          {selectedSkills.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Learning ({selectedSkills.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedSkills.map(({ skillId, depth }) => {
                  const skill = skills.find((s) => s.id === skillId);
                  const depthLabel = DEPTH_LEVELS.find((d) => d.value === depth)?.label;
                  return skill ? (
                    <Badge key={skillId} variant="secondary">
                      {skill.name} ({depthLabel})
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-6">
            <Link href="/onboarding/share-side">
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
