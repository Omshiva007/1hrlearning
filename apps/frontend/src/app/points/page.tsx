import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import { PointsClient } from './PointsClient';

export const metadata: Metadata = {
  title: 'Points & Credits | 1hrLearning',
  description: 'Manage your points balance and view transaction history.',
  robots: { index: false, follow: false },
};

export default async function PointsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Points & Credits</h1>
        <p className="text-muted-foreground">
          Earn points by teaching. Spend points to book learning sessions.
        </p>
      </div>
      <PointsClient token={session.accessToken as string} />
    </div>
  );
}
