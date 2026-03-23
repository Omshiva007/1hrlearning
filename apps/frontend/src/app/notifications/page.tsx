import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <button className="text-sm text-muted-foreground hover:text-foreground">
          Mark all as read
        </button>
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">🔔 No notifications yet</p>
        <p className="text-sm mt-2">We&apos;ll notify you about sessions, connections, and more.</p>
      </div>
    </div>
  );
}
