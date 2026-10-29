import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Dashboard | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.authError || !session.accessToken) redirect('/login?reason=session-expired');

  // Server-side enforcement prevents a client redirect race from exposing the normal product too early.
  let response: Response;
  try {
    const backendUrl = process.env.BACKEND_URL ?? (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);
    if (!backendUrl) throw new Error('BACKEND_URL is not configured');
    response = await fetch(`${backendUrl}/api/v1/users/${session.user?.id}`, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
      cache: 'no-store',
    });

  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    // An unavailable trust-boundary check must not silently grant access to the post-onboarding dashboard.
    redirect('/onboarding/profile?status=verification-unavailable');
  }
  if (response.status === 401 || response.status === 403) redirect('/login');
  if (!response.ok) redirect('/onboarding/profile?status=verification-unavailable');
  const user = await response.json();
  if (!user.data?.isOnboardingComplete) redirect('/onboarding/profile');

  let notifications: Array<{ id: string; title: string; message: string }> = [];
  let notificationsUnavailable = false;
  try {
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
    const notificationResponse = await fetch(`${backendUrl}/api/v1/notifications?limit=3`, {
      headers: { Authorization: `Bearer ${session.accessToken}` }, cache: 'no-store',
    });
    if (!notificationResponse.ok) throw new Error('Notification request failed');
    const payload = await notificationResponse.json();
    notifications = payload.data ?? [];
  } catch {
    // Dashboard core metrics remain useful while this independent panel exposes its recoverable failure state.
    notificationsUnavailable = true;
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {session.user?.name}!</h1>
        <p className="text-muted-foreground">Here&apos;s what&apos;s happening with your learning journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { title: 'Sessions Taught', value: String(user.data.totalSessionsTaught ?? 0), icon: '🎓', href: '/sessions?role=teacher' },
          { title: 'Sessions Learned', value: String(user.data.totalSessionsLearned ?? 0), icon: '📖', href: '/sessions?role=learner' },
          { title: 'Available / Locked Points', value: `${user.data.pointsBalance ?? 0} / ${user.data.pointsLocked ?? 0}`, icon: '💎', href: '/points' },
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
            <Link href="/skills" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-sm">
              <span>🔍</span> Browse Skills to Learn
            </Link>
            <Link href="/onboarding/profile" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-sm">
              <span>✏️</span> Update Your Profile & Skills
            </Link>
            <Link href="/sessions" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors text-sm">
              <span>📅</span> View Upcoming Sessions
            </Link>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="font-semibold mb-4">Recent Notifications</h2>
          {notificationsUnavailable ? (
            <p role="alert" className="text-sm text-destructive">Notifications are temporarily unavailable. Refresh to retry.</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent notifications.</p>
          ) : (
            <ul className="space-y-3">
              {notifications.map((notification) => <li key={notification.id}><p className="text-sm font-medium">{notification.title}</p><p className="text-xs text-muted-foreground">{notification.message}</p></li>)}
            </ul>
          )}
          <a href="/notifications" className="text-xs text-primary hover:underline mt-2 block">
            View all notifications →
          </a>
        </div>
      </div>
    </div>
  );
}
