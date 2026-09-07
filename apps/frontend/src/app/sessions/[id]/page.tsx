import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Session, PublicUser } from '@1hrlearning/shared';

type SessionDetail = Session & {
  teacher: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'>;
  learner: Pick<PublicUser, 'id' | 'username' | 'displayName' | 'avatarUrl'> | null;
};

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const userSession = await auth();
  if (!userSession?.accessToken) redirect('/login');

  const { id } = await params;
  let item: SessionDetail;
  try {
    item = await api.get<SessionDetail>(`/sessions/${id}`, userSession.accessToken);
  } catch {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link href="/sessions" className="mb-4 inline-block text-sm text-primary hover:underline">
        Back to sessions
      </Link>
      <Card className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{item.sessionType === 'QUERY_CLARIFICATION' ? 'Q&A session' : 'Teaching session'}</p>
            <h1 className="text-2xl font-bold">{item.skill.name}</h1>
          </div>
          <Badge>{item.status}</Badge>
        </div>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Sharer</dt>
            <dd><Link className="hover:underline" href={`/profile/${item.teacher.username}`}>{item.teacher.displayName}</Link></dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Learner</dt>
            <dd>{item.learner ? <Link className="hover:underline" href={`/profile/${item.learner.username}`}>{item.learner.displayName}</Link> : 'Open seat'}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Scheduled</dt>
            <dd>{new Date(item.scheduledAt).toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Duration and points</dt>
            <dd>{item.durationMinutes} minutes / {item.pointsPerSession} points</dd>
          </div>
        </dl>
        {item.agenda && <div><h2 className="font-semibold">Agenda</h2><p className="text-muted-foreground">{item.agenda}</p></div>}
        {item.notes && <div><h2 className="font-semibold">Notes</h2><p className="text-muted-foreground">{item.notes}</p></div>}
        {item.meetingUrl && item.status === 'CONFIRMED' && (
          <a href={item.meetingUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-md bg-primary px-4 py-2 text-primary-foreground">
            Join meeting
          </a>
        )}
      </Card>
    </div>
  );
}
