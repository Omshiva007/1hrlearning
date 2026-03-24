'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPaginated, api } from '@/lib/api';
import type { Session, SessionApplication } from '@1hrlearning/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface SessionsClientProps {
  token: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED: { label: 'Confirmed', color: 'bg-blue-100 text-blue-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-purple-100 text-purple-700' },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700' },
  NO_SHOW: { label: 'No Show', color: 'bg-gray-100 text-gray-700' },
};

interface SessionWithRelations extends Session {
  teacher: { id: string; username: string; displayName: string; avatarUrl: string | null };
  learner: { id: string; username: string; displayName: string; avatarUrl: string | null } | null;
  ratings: Array<{ raterId: string; score: number }>;
  applications?: SessionApplication[];
}

function CalendarButton({ sessionId, token }: { sessionId: string; token: string }) {
  const handleDownload = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/sessions/${sessionId}/calendar.ics`;
    // Fetch with Authorization header and trigger download
    void fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `session-${sessionId}.ics`;
        a.click();
        URL.revokeObjectURL(blobUrl);
      });
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} title="Add to Calendar">
      📅 Calendar
    </Button>
  );
}

function ApplicationsPanel({
  sessionId,
  token,
}: {
  sessionId: string;
  token: string;
}) {
  const queryClient = useQueryClient();

  const appQuery = useQuery({
    queryKey: ['session-applications', sessionId],
    queryFn: () => api.get<SessionApplication[]>(`/sessions/${sessionId}/applications`, token),
  });

  const respondMutation = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: 'ACCEPTED' | 'REJECTED' }) =>
      api.patch(`/sessions/${sessionId}/applications/${appId}`, { status }, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['session-applications', sessionId] });
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  if (appQuery.isLoading) return <div className="text-xs text-muted-foreground">Loading applications…</div>;
  if (!appQuery.data || appQuery.data.length === 0) {
    return <p className="text-xs text-muted-foreground">No applications yet.</p>;
  }

  return (
    <div className="space-y-2">
      {appQuery.data.map((app) => (
        <div key={app.id} className="flex items-center justify-between border rounded-md p-2 gap-3">
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarImage src={(app.applicant as { avatarUrl?: string })?.avatarUrl ?? ''} alt={(app.applicant as { displayName?: string })?.displayName ?? ''} />
              <AvatarFallback className="text-xs">{getInitials((app.applicant as { displayName?: string })?.displayName ?? 'U')}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{(app.applicant as { displayName?: string })?.displayName}</p>
              {app.message && <p className="text-xs text-muted-foreground line-clamp-1">{app.message}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {app.status === 'PENDING' ? (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => respondMutation.mutate({ appId: app.id, status: 'ACCEPTED' })}
                  disabled={respondMutation.isPending}
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => respondMutation.mutate({ appId: app.id, status: 'REJECTED' })}
                  disabled={respondMutation.isPending}
                >
                  Decline
                </Button>
              </>
            ) : (
              <Badge className={`text-xs ${app.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {app.status}
              </Badge>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionCard({ session, token, userId }: { session: SessionWithRelations; token: string; userId: string }) {
  const [showApps, setShowApps] = useState(false);
  const queryClient = useQueryClient();
  const isTeacher = session.teacherId === userId;
  const statusCfg = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.PENDING;
  const scheduledAt = new Date(session.scheduledAt);
  const hasRated = session.ratings.some((r) => r.raterId === userId);
  const canRate = session.status === 'COMPLETED' && !hasRated;
  const [ratingScore, setRatingScore] = useState(5);
  const [showRate, setShowRate] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/sessions/${session.id}`, { status }, token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const rateMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${session.id}/rate`, { score: ratingScore }, token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowRate(false);
    },
  });

  const other = isTeacher ? session.learner : session.teacher;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {other && (
              <Avatar className="h-10 w-10">
                <AvatarImage src={other.avatarUrl ?? ''} alt={other.displayName} />
                <AvatarFallback>{getInitials(other.displayName)}</AvatarFallback>
              </Avatar>
            )}
            <div>
              <p className="font-semibold">
                {session.skill.name}
                {session.sessionType === 'QUERY_CLARIFICATION' && <span className="ml-1 text-xs text-muted-foreground">(Q&A)</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {isTeacher ? '🎓 Teaching' : '📖 Learning'}
                {other ? ` · ${other.displayName}` : ''}
              </p>
            </div>
          </div>
          <Badge className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground space-y-1">
          <div>📅 {scheduledAt.toLocaleDateString()} at {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div>⏱️ {session.durationMinutes} min · 💎 {session.pointsTransferred} pts</div>
          {session.isPublic && !session.learnerId && <div>🔓 Open for applications</div>}
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Calendar download for confirmed/completed */}
          {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(session.status) && (
            <CalendarButton sessionId={session.id} token={token} />
          )}

          {/* Teacher actions */}
          {isTeacher && session.status === 'PENDING' && session.learnerId && (
            <Button size="sm" onClick={() => updateMutation.mutate('CONFIRMED')} disabled={updateMutation.isPending}>
              Confirm
            </Button>
          )}
          {isTeacher && session.status === 'CONFIRMED' && (
            <Button size="sm" onClick={() => updateMutation.mutate('COMPLETED')} disabled={updateMutation.isPending}>
              Mark Complete
            </Button>
          )}

          {/* Cancel */}
          {['PENDING', 'CONFIRMED'].includes(session.status) && (
            <Button size="sm" variant="outline" onClick={() => updateMutation.mutate('CANCELLED')} disabled={updateMutation.isPending}>
              Cancel
            </Button>
          )}

          {/* Rate */}
          {canRate && (
            <Button size="sm" variant="outline" onClick={() => setShowRate(!showRate)}>
              ⭐ Rate
            </Button>
          )}

          {/* Applications (teacher, public session) */}
          {isTeacher && session.isPublic && (
            <Button size="sm" variant="outline" onClick={() => setShowApps(!showApps)}>
              Applications {showApps ? '▲' : '▼'}
            </Button>
          )}
        </div>

        {showRate && (
          <div className="border rounded-md p-3 space-y-2">
            <p className="text-xs font-medium">Rate this session</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setRatingScore(s)}
                  className={`text-xl ${s <= ratingScore ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => rateMutation.mutate()} disabled={rateMutation.isPending}>
              Submit Rating
            </Button>
          </div>
        )}

        {showApps && (
          <div className="border rounded-md p-3">
            <p className="text-xs font-medium mb-2">Applications</p>
            <ApplicationsPanel sessionId={session.id} token={token} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SessionsClient({ token }: SessionsClientProps) {
  const [role, setRole] = useState<'all' | 'teacher' | 'learner'>('all');
  // userId from token would ideally come from auth context; using a dummy here — in real app pass from server
  const profileQuery = useQuery({
    queryKey: ['my-profile-id'],
    queryFn: () => api.get<{ id: string }>('/auth/me', token),
  });
  const userId = (profileQuery.data as { id?: string })?.id ?? '';

  const sessionsQuery = useQuery({
    queryKey: ['sessions', role],
    queryFn: () => fetchPaginated<SessionWithRelations>('/sessions', { role, limit: 30 }, token),
  });

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b">
        {[
          { key: 'all', label: 'All' },
          { key: 'teacher', label: '🎓 Teaching' },
          { key: 'learner', label: '📖 Learning' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRole(tab.key as typeof role)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              role === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {sessionsQuery.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {sessionsQuery.data?.data.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">No sessions yet</p>
          <p className="text-sm mb-4">Create a session or discover open ones.</p>
          <div className="flex gap-3 justify-center">
            <Button asChild>
              <a href="/sessions/new">Create Session</a>
            </Button>
            <Button variant="outline" asChild>
              <a href="/discover">Discover Sessions</a>
            </Button>
          </div>
        </div>
      )}

      {sessionsQuery.data && sessionsQuery.data.data.length > 0 && userId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessionsQuery.data.data.map((session) => (
            <SessionCard key={session.id} session={session} token={token} userId={userId} />
          ))}
        </div>
      )}
    </div>
  );
}
