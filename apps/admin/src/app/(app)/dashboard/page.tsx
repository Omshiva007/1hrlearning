'use client';

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

  const stats = (data as AdminStats | undefined)?.healthMetrics;
  const learnerTopics = (data as AdminStats | undefined)?.topLearnerTopics ?? [];
  const sharerTopics = (data as AdminStats | undefined)?.topSharerTopics ?? [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview and master data management</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Users" value={stats?.totalUsers ?? 0} icon="👥" />
        <StatsCard title="Active (7 days)" value={stats?.activeUsers7d ?? 0} icon="✅" />
        <StatsCard title="Completed Sessions" value={stats?.totalSessionsCompleted ?? 0} icon="📅" />
        <StatsCard title="Open Flags" value={stats?.openFlags ?? 0} icon="🚩" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Category Breakdown */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Learning Demand</h2>
          {learnerTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No data available</p>
          ) : (
            <div className="space-y-2">
              {learnerTopics.map((item) => (
                <div key={item.skillId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                    {item._count.userId}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supply snapshot uses the same server-calculated aggregation as matching operations. */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Teaching Supply</h2>
          </div>
          {sharerTopics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No supply data available</p>
          ) : (
            <div className="space-y-3">
              {sharerTopics.map((item) => (
                <div key={item.skillId} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-medium">{item._count.userId}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Operational health is intentionally explicit so percentages cannot be mistaken for counts. */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Operational Health</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 border rounded-md"><p className="text-muted-foreground">Active rate</p><p className="font-semibold">{stats?.activeRate7d ?? 0}%</p></div>
          <div className="p-3 border rounded-md"><p className="text-muted-foreground">Onboarding drop-off</p><p className="font-semibold">{stats?.onboardingDropOff ?? 0}%</p></div>
          <div className="p-3 border rounded-md"><p className="text-muted-foreground">No-show rate</p><p className="font-semibold">{stats?.noShowRate ?? 0}%</p></div>
          <div className="p-3 border rounded-md"><p className="text-muted-foreground">Points in circulation</p><p className="font-semibold">{stats?.pointsInCirculation ?? 0}</p></div>
        </div>
      </div>
    </div>
  );
}
