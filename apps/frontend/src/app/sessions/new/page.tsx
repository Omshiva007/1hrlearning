import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';
import { CreateSessionClient } from './CreateSessionClient';

export const metadata: Metadata = {
  title: 'Create Session | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function NewSessionPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create a Session</h1>
        <p className="text-muted-foreground">
          Offer a teaching session — privately to one person or publicly for anyone to apply.
        </p>
      </div>
      <CreateSessionClient token={session.accessToken as string} />
    </div>
  );
}
