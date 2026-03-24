import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import { SessionsClient } from './SessionsClient';

export const metadata: Metadata = {
  title: 'My Sessions | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function SessionsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Sessions</h1>
          <p className="text-muted-foreground">Manage your teaching and learning sessions.</p>
        </div>
        <a
          href="/sessions/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          + Create Session
        </a>
      </div>
      <SessionsClient token={session.accessToken as string} />
    </div>
  );
}
