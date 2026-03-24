'use client';

import { useState } from 'react';
import {
  useAdminSkills,
  useAdminCreateSkill,
  useAdminUpdateSkill,
  useAdminDeleteSkill,
} from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SKILL_CATEGORIES } from '@1hrlearning/shared';
import type { Skill } from '@1hrlearning/shared';

interface SkillForm {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  isApproved: boolean;
}

const DEFAULT_FORM: SkillForm = {
  name: '',
  description: '',
  category: SKILL_CATEGORIES[0],
  subcategory: '',
  isApproved: true,
};

export default function SkillsPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [form, setForm] = useState<SkillForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');

  const { data, isLoading, error } = useAdminSkills({
    q: search || undefined,
    category: categoryFilter || undefined,
    page,
    limit: 20,
  });

  const createSkill = useAdminCreateSkill();
  const updateSkill = useAdminUpdateSkill();
  const deleteSkill = useAdminDeleteSkill();

  const skills =
    (data as { data: Skill[]; pagination: unknown } | undefined)?.data ?? [];
  const pagination = (
    data as {
      data: Skill[];
      pagination: { page: number; totalPages: number; total: number };
    } | undefined
  )?.pagination;

  function openCreateForm() {
    setEditingSkill(null);
    setForm(DEFAULT_FORM);
    setFormError('');
    setShowForm(true);
  }

  function openEditForm(skill: Skill) {
    setEditingSkill(skill);
    setForm({
      name: skill.name,
      description: skill.description ?? '',
      category: skill.category,
      subcategory: skill.subcategory ?? '',
      isApproved: skill.isApproved,
    });
    setFormError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingSkill(null);
    setForm(DEFAULT_FORM);
    setFormError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) {
      setFormError('Skill name is required');
      return;
    }
    if (!form.category) {
      setFormError('Category is required');
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      category: form.category,
      subcategory: form.subcategory.trim() || undefined,
      isApproved: form.isApproved,
    };

    try {
      if (editingSkill) {
        await updateSkill.mutateAsync({ id: editingSkill.id, input: payload });
      } else {
        await createSkill.mutateAsync(payload);
      }
      closeForm();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save skill');
    }
  }

  async function handleDelete(skill: Skill) {
    if (!confirm(`Delete skill "${skill.name}"? This cannot be undone.`)) return;
    try {
      await deleteSkill.mutateAsync(skill.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete skill');
    }
  }

  const isPending = createSkill.isPending || updateSkill.isPending;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Skills Management</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `${pagination.total} skills total` : 'Manage master skill data'}
          </p>
        </div>
        <Button onClick={openCreateForm}>+ Add Skill</Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Input
          placeholder="Search skills…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setCategoryFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Categories</option>
          {SKILL_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {(search || categoryFilter) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setCategoryFilter('');
              setPage(1);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="mb-6 rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">{editingSkill ? 'Edit Skill' : 'Create New Skill'}</h2>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-medium">Name *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. JavaScript"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Subcategory</label>
                <Input
                  value={form.subcategory}
                  onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
                  placeholder="e.g. Frontend"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Status</label>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="isApproved"
                    checked={form.isApproved}
                    onChange={(e) => setForm((f) => ({ ...f, isApproved: e.target.checked }))}
                  />
                  <label htmlFor="isApproved" className="text-sm">
                    Approved (visible to users)
                  </label>
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Description</label>
              <textarea
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                rows={2}
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description…"
              />
            </div>
            {formError && <p className="text-xs text-destructive">{formError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? 'Saving…' : editingSkill ? 'Save Changes' : 'Create Skill'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={closeForm}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Skills Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-md border bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load skills: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : skills.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="font-medium">No skills found</p>
          <p className="text-sm mt-1">
            {search || categoryFilter
              ? 'Try adjusting your filters'
              : 'Click "+ Add Skill" to create the first skill'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">Skill</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Users</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {skills.map((skill) => (
                <tr key={skill.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3">
                    <p className="font-medium">{skill.name}</p>
                    {skill.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {skill.description}
                      </p>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {skill.category}
                    </Badge>
                    {skill.subcategory && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {skill.subcategory}
                      </span>
                    )}
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-muted-foreground">{skill.userCount}</span>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        skill.isApproved
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {skill.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => openEditForm(skill)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                        onClick={() => void handleDelete(skill)}
                        disabled={deleteSkill.isPending}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <p className="text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ← Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
