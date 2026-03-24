'use client';

import { useState } from 'react';
import type { UserSkill, Skill, SkillLevel } from '@1hrlearning/shared';
import { useUserSkills, useAddUserSkill, useUpdateUserSkill, useRemoveUserSkill } from '@/hooks/useSkills';
import { useSkills } from '@/hooks/useSkills';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const LEVELS: SkillLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

const LEVEL_COLORS: Record<SkillLevel, string> = {
  BEGINNER: 'bg-green-100 text-green-800',
  INTERMEDIATE: 'bg-blue-100 text-blue-800',
  ADVANCED: 'bg-purple-100 text-purple-800',
  EXPERT: 'bg-orange-100 text-orange-800',
};

interface SkillFormState {
  skillId: string;
  level: SkillLevel;
  isTeaching: boolean;
  isLearning: boolean;
  description: string;
  yearsOfExperience: string;
}

const DEFAULT_FORM: SkillFormState = {
  skillId: '',
  level: 'BEGINNER',
  isTeaching: false,
  isLearning: true,
  description: '',
  yearsOfExperience: '',
};

interface SkillsManagerProps {
  userId: string;
}

export function SkillsManager({ userId }: SkillsManagerProps) {
  const { data: userSkills, isLoading } = useUserSkills(userId);
  const addSkill = useAddUserSkill(userId);
  const updateSkill = useUpdateUserSkill(userId);
  const removeSkill = useRemoveUserSkill(userId);

  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [form, setForm] = useState<SkillFormState>(DEFAULT_FORM);
  const [skillSearch, setSkillSearch] = useState('');
  const [error, setError] = useState('');

  const { data: availableSkills } = useSkills({ q: skillSearch, limit: 20 });

  function openAddForm() {
    setEditingSkill(null);
    setForm(DEFAULT_FORM);
    setSkillSearch('');
    setError('');
    setShowForm(true);
  }

  function openEditForm(us: UserSkill) {
    setEditingSkill(us);
    setForm({
      skillId: us.skillId,
      level: us.level,
      isTeaching: us.isTeaching,
      isLearning: us.isLearning,
      description: us.description ?? '',
      yearsOfExperience: us.yearsOfExperience != null ? String(us.yearsOfExperience) : '',
    });
    setSkillSearch(us.skill.name);
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingSkill(null);
    setForm(DEFAULT_FORM);
    setSkillSearch('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.skillId) {
      setError('Please select a skill');
      return;
    }
    if (!form.isTeaching && !form.isLearning) {
      setError('Please select at least one of Teaching or Learning');
      return;
    }

    const payload = {
      level: form.level,
      isTeaching: form.isTeaching,
      isLearning: form.isLearning,
      description: form.description || null,
      yearsOfExperience: form.yearsOfExperience ? parseInt(form.yearsOfExperience, 10) : null,
    };

    try {
      if (editingSkill) {
        await updateSkill.mutateAsync({ skillId: editingSkill.skillId, input: payload });
      } else {
        await addSkill.mutateAsync({ skillId: form.skillId, ...payload });
      }
      closeForm();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
    }
  }

  async function handleRemove(skillId: string) {
    if (!confirm('Remove this skill from your profile?')) return;
    try {
      await removeSkill.mutateAsync(skillId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to remove skill';
      setError(message);
    }
  }

  const isPending = addSkill.isPending || updateSkill.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">🛠️ My Skills</CardTitle>
        {!showForm && (
          <Button size="sm" onClick={openAddForm}>
            + Add Skill
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add / Edit Form */}
        {showForm && (
          <form onSubmit={(e) => void handleSubmit(e)} className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <h3 className="font-semibold text-sm">{editingSkill ? 'Edit Skill' : 'Add New Skill'}</h3>

            {/* Skill selector (only for add) */}
            {!editingSkill && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Skill *</label>
                <Input
                  placeholder="Search for a skill…"
                  value={skillSearch}
                  onChange={(e) => {
                    setSkillSearch(e.target.value);
                    if (form.skillId) setForm((f) => ({ ...f, skillId: '' }));
                  }}
                />
                {skillSearch && !form.skillId && (
                  <div className="border rounded-md bg-background shadow-sm max-h-40 overflow-y-auto">
                    {availableSkills?.data?.length === 0 && (
                      <p className="text-xs text-muted-foreground p-3">No skills found</p>
                    )}
                    {availableSkills?.data?.map((skill: Skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                        onClick={() => {
                          setForm((f) => ({ ...f, skillId: skill.id }));
                          setSkillSearch(skill.name);
                        }}
                      >
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{skill.category}</span>
                      </button>
                    ))}
                  </div>
                )}
                {form.skillId && (
                  <p className="text-xs text-green-700 font-medium">✓ Selected: {skillSearch}</p>
                )}
              </div>
            )}
            {editingSkill && (
              <div>
                <label className="text-xs font-medium">Skill</label>
                <p className="text-sm font-semibold mt-1">{editingSkill.skill.name}</p>
              </div>
            )}

            {/* Proficiency level */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Proficiency Level *</label>
              <div className="flex flex-wrap gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, level: lvl }))}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.level === lvl
                        ? `${LEVEL_COLORS[lvl]} border-transparent`
                        : 'border-input bg-background hover:bg-muted'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Teaching / Learning toggles */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isTeaching}
                  onChange={(e) => setForm((f) => ({ ...f, isTeaching: e.target.checked }))}
                  className="rounded"
                />
                🎓 I can teach this
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isLearning}
                  onChange={(e) => setForm((f) => ({ ...f, isLearning: e.target.checked }))}
                  className="rounded"
                />
                📖 I want to learn this
              </label>
            </div>

            {/* Years of experience */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Years of Experience (optional)</label>
              <Input
                type="number"
                min={0}
                max={50}
                placeholder="e.g. 3"
                value={form.yearsOfExperience}
                onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))}
                className="w-32"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium">Description (optional)</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                rows={2}
                maxLength={300}
                placeholder="Brief description of your experience…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : editingSkill ? 'Save Changes' : 'Add Skill'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Skills list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading skills…</p>
        ) : userSkills && userSkills.length > 0 ? (
          <div className="space-y-3">
            {userSkills.map((us) => (
              <div
                key={us.id}
                className="flex items-start justify-between gap-3 p-3 border rounded-lg bg-background"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-medium text-sm">{us.skill.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${LEVEL_COLORS[us.level]}`}
                    >
                      {us.level}
                    </span>
                    {us.isTeaching && (
                      <Badge variant="secondary" className="text-xs">🎓 Teaching</Badge>
                    )}
                    {us.isLearning && (
                      <Badge variant="outline" className="text-xs">📖 Learning</Badge>
                    )}
                  </div>
                  {us.yearsOfExperience != null && (
                    <p className="text-xs text-muted-foreground">{us.yearsOfExperience} yr{us.yearsOfExperience !== 1 ? 's' : ''} experience</p>
                  )}
                  {us.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{us.description}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => openEditForm(us)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => void handleRemove(us.skillId)}
                    disabled={removeSkill.isPending}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !showForm && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm mb-3">No skills added yet.</p>
              <Button size="sm" onClick={openAddForm}>Add your first skill</Button>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
