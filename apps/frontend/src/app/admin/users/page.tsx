'use client';

import { useState } from 'react';
import { useAdminUsers, useAdminUpdateUserRole, useAdminUpdateUserStatus } from '@/hooks/useAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

const ROLES = ['USER', 'MODERATOR', 'ADMIN'];

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useAdminUsers({
    q: search || undefined,
    role: roleFilter || undefined,
    page,
    limit: 20,
  });

  const updateRole = useAdminUpdateUserRole();
  const updateStatus = useAdminUpdateUserStatus();

  const rawData = data as { data: AdminUser[]; pagination: { page: number; totalPages: number; total: number } } | undefined;
  const users = rawData?.data ?? [];
  const pagination = rawData?.pagination;

  async function handleRoleChange(user: AdminUser, newRole: string) {
    if (newRole === user.role) return;
    if (!confirm(`Change ${user.username}'s role from ${user.role} to ${newRole}?`)) return;
    try {
      await updateRole.mutateAsync({ id: user.id, role: newRole });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update role');
    }
  }

  async function handleStatusToggle(user: AdminUser) {
    const action = user.isActive ? 'deactivate' : 'activate';
    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} user ${user.username}?`)) return;
    try {
      await updateStatus.mutateAsync({ id: user.id, isActive: !user.isActive });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Users Management</h1>
          <p className="text-muted-foreground mt-1">
            {pagination ? `${pagination.total} users total` : 'Manage user accounts and roles'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <Input
          placeholder="Search users…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        {(search || roleFilter) && (
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 rounded-md border bg-card animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load users: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">👥</p>
          <p className="font-medium">No users found</p>
          {(search || roleFilter) && <p className="text-sm mt-1">Try adjusting your filters</p>}
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium hidden md:table-cell">Skills</th>
                <th className="text-left p-3 font-medium hidden lg:table-cell">Sessions</th>
                <th className="text-left p-3 font-medium">Role</th>
                <th className="text-left p-3 font-medium hidden sm:table-cell">Status</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className={`hover:bg-muted/30 transition-colors ${!user.isActive ? 'opacity-60' : ''}`}>
                  <td className="p-3">
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">@{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </td>
                  <td className="p-3 hidden md:table-cell">
                    <span className="text-muted-foreground">{user._count.skills}</span>
                  </td>
                  <td className="p-3 hidden lg:table-cell">
                    <span className="text-xs text-muted-foreground">
                      {user.totalSessionsTaught} taught · {user.totalSessionsLearned} learned
                    </span>
                  </td>
                  <td className="p-3">
                    <select
                      value={user.role}
                      onChange={(e) => void handleRoleChange(user, e.target.value)}
                      className={`text-xs rounded px-2 py-1 border font-medium ${
                        user.role === 'ADMIN'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : user.role === 'MODERATOR'
                          ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <a
                        href={`/profile/${user.username}`}
                        className="text-xs text-primary hover:underline px-2 py-1"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        className={`h-7 px-2 text-xs ${user.isActive ? 'text-destructive hover:text-destructive' : ''}`}
                        onClick={() => void handleStatusToggle(user)}
                        disabled={updateStatus.isPending}
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
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
