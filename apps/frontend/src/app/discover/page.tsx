import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import { DiscoverClient } from './DiscoverClient';

export const metadata: Metadata = {
  title: 'Discover | 1hrLearning',
  description: 'Find your perfect skill-exchange partner or join an open learning session.',
  robots: { index: false, follow: false },
};

export default async function DiscoverPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Discover</h1>
        <p className="text-muted-foreground">
          Find skill-match partners or join an open public session.
        </p>
      </div>
      <DiscoverClient token={session.accessToken as string} />
    </div>
  );
}
