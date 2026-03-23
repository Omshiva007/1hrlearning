import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Sessions | 1hrLearning',
  robots: { index: false, follow: false },
};

export default async function SessionsPage() {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Sessions</h1>
        <p className="text-muted-foreground">Manage your teaching and learning sessions.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <a href="?role=all" className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground">All</a>
        <a href="?role=teacher" className="px-4 py-2 rounded-md text-sm border hover:bg-muted">Teaching</a>
        <a href="?role=learner" className="px-4 py-2 rounded-md text-sm border hover:bg-muted">Learning</a>
      </div>

      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg mb-2">No sessions yet</p>
        <p className="text-sm">Browse skills and connect with teachers or learners to get started.</p>
        <a href="/skills" className="inline-block mt-4 text-primary hover:underline text-sm">
          Browse Skills →
        </a>
      </div>
    </div>
  );
}
