import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {session.user?.name}!</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your learning journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Sessions Taught', value: '—', icon: '🎓', href: '/sessions?role=teacher' },
          { title: 'Sessions Learned', value: '—', icon: '📖', href: '/sessions?role=learner' },
          { title: 'Points Balance', value: '—', icon: '💎', href: '/points' },
        ].map((card) => (
          <a key={card.title} href={card.href} className="block">
            <div className="rounded-lg border bg-card p-6 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </div>
          </a>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a href="/skills" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-sm">
              <span>🔍</span> Browse Skills to Learn
            </a>
            <a href="/profile" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-sm">
              <span>✏️</span> Update Your Profile & Skills
            </a>
            <a href="/sessions" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-sm">
              <span>📅</span> View Upcoming Sessions
            </a>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Recent Notifications</h2>
          <p className="text-sm text-muted-foreground">No recent notifications.</p>
          <a href="/notifications" className="text-xs text-primary hover:underline mt-2 block">
            View all notifications →
          </a>
        </div>
      </div>
    </div>
  );
}
