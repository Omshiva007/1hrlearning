'use client';

import Link from 'next/link';
import { useAdminDashboard, type AdminStats } from '@/hooks/useAdmin';
import { StatsCard } from '@/components/StatsCard';

export default function DashboardPage() {
  const { data, isLoading, error } = useAdminDashboard();

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load dashboard: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  const stats = (data as AdminStats | undefined)?.stats;
  const categoryBreakdown = (data as AdminStats | undefined)?.categoryBreakdown ?? [];
  const recentUsers = (data as AdminStats | undefined)?.recentUsers ?? [];
  const recentSkills = (data as AdminStats | undefined)?.recentSkills ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview and master data management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Users" value={stats?.totalUsers ?? 0} icon="👥" />
        <StatsCard title="Total Skills" value={stats?.totalSkills ?? 0} icon="🛠️" />
        <StatsCard title="User-Skill Links" value={stats?.totalUserSkills ?? 0} icon="🔗" />
        <StatsCard title="Total Sessions" value={stats?.totalSessions ?? 0} icon="📅" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Skills by Category</h2>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="space-y-2">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.category}</span>
                  <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Users */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Users</h2>
            <Link href="/users" className="text-xs text-primary hover:underline">
              View all →
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users yet</p>
          ) : (
            <div className="space-y-3">
              {recentUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-red-100 text-red-700'
                        : user.role === 'MODERATOR'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Skills */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Recent Skills</h2>
          <Link href="/skills" className="text-xs text-primary hover:underline">
            View all →
          </Link>
        </div>
        {recentSkills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills yet</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentSkills.map((skill) => (
              <div key={skill.id} className="p-3 border rounded-md text-sm">
                <p className="font-medium">{skill.name}</p>
                <p className="text-xs text-muted-foreground">
                  {skill.category} · {skill.userCount} users
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
