'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, fetchPaginated } from '@/lib/api';
import type { MatchScore, Session } from '@1hrlearning/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface DiscoverClientProps {
  token: string;
}

type TabType = 'matches' | 'sessions';

function ScoreBar({ label, value, max = 1, color }: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MatchCard({ match, token }: { match: MatchScore; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const maxSkillOverlap = Math.max(match.scoreFactors.skillOverlap, 1);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href={`/profile/${match.user.username}`}>
              <Avatar className="h-12 w-12">
                <AvatarImage src={match.user.avatarUrl ?? ''} alt={match.user.displayName} />
                <AvatarFallback>{getInitials(match.user.displayName)}</AvatarFallback>
              </Avatar>
            </a>
            <div>
              <a href={`/profile/${match.user.username}`} className="font-semibold hover:underline">
                {match.user.displayName}
              </a>
              <p className="text-xs text-muted-foreground">@{match.user.username}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-primary">{Math.round(match.score * 100)}%</div>
            <div className="text-xs text-muted-foreground">match score</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {match.user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{match.user.bio}</p>
        )}

        <div className="flex flex-wrap gap-1">
          {match.canTeachMe.slice(0, 3).map((skill) => (
            <Badge key={skill.id} variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
              📚 {skill.name}
            </Badge>
          ))}
          {match.iCanTeach.slice(0, 3).map((skill) => (
            <Badge key={skill.id} variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              🎓 {skill.name}
            </Badge>
          ))}
        </div>

        <div className="text-xs text-muted-foreground flex gap-4">
          <span>⭐ {match.user.averageRating?.toFixed(1) ?? '—'}</span>
          <span>🎓 {match.user.totalSessionsTaught} taught</span>
          <span>📖 {match.user.totalSessionsLearned} learned</span>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-primary hover:underline"
        >
          {expanded ? '▲ Hide score details' : '▼ Why this match?'}
        </button>

        {expanded && (
          <div className="pt-2 space-y-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">Score factors</p>
            <ScoreBar label="Skill overlap" value={match.scoreFactors.skillOverlap} max={Math.max(maxSkillOverlap, 4)} color="bg-green-500" />
            <ScoreBar label="Mutual exchange bonus" value={match.scoreFactors.mutualExchangeBonus} max={0.5} color="bg-purple-500" />
            <ScoreBar label="Rating quality" value={match.scoreFactors.ratingBonus} max={0.5} color="bg-yellow-500" />
            <ScoreBar label="Activity level" value={match.scoreFactors.activityBonus} max={0.3} color="bg-blue-500" />
          </div>
        )}

        <Button size="sm" variant="outline" className="w-full" asChild>
          <a href={`/profile/${match.user.username}`}>View Profile</a>
        </Button>
      </CardContent>
    </Card>
  );
}

interface PublicSession extends Session {
  teacher: { id: string; username: string; displayName: string; avatarUrl: string | null; averageRating: number | null; isVerified: boolean };
  applications?: Array<{ id: string; status: string }>;
}

function PublicSessionCard({ session, token, onApplied }: { session: PublicSession; token: string; onApplied: () => void }) {
  const [message, setMessage] = useState('');
  const [showApply, setShowApply] = useState(false);
  const hasApplied = (session.applications ?? []).length > 0;
  const scheduledAt = new Date(session.scheduledAt);

  const applyMutation = useMutation({
    mutationFn: () => api.post(`/sessions/${session.id}/apply`, { message }, token),
    onSuccess: onApplied,
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{session.skill.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Avatar className="h-6 w-6">
                <AvatarImage src={session.teacher.avatarUrl ?? ''} alt={session.teacher.displayName} />
                <AvatarFallback className="text-xs">{getInitials(session.teacher.displayName)}</AvatarFallback>
              </Avatar>
              <a href={`/profile/${session.teacher.username}`} className="text-sm hover:underline">
                {session.teacher.displayName}
              </a>
              {session.teacher.isVerified && <span title="Verified">✅</span>}
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            {session.sessionType === 'QUERY_CLARIFICATION' ? '💬 Q&A' : '🎓 Teaching'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {session.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{session.notes}</p>
        )}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>📅 {scheduledAt.toLocaleDateString()} at {scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          <div>⏱️ {session.durationMinutes} minutes</div>
          {session.applicationDeadline && (
            <div>⏳ Apply by {new Date(session.applicationDeadline).toLocaleDateString()}</div>
          )}
          {session.teacher.averageRating && (
            <div>⭐ {session.teacher.averageRating.toFixed(1)} avg rating</div>
          )}
        </div>

        {hasApplied ? (
          <div className="text-center py-2 text-sm text-muted-foreground">
            ✓ Applied
          </div>
        ) : showApply ? (
          <div className="space-y-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Optional message to the teacher..."
              className="w-full text-sm border rounded-md p-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
              >
                {applyMutation.isPending ? 'Sending…' : 'Send Application'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
            </div>
            {applyMutation.isError && (
              <p className="text-xs text-red-600">{(applyMutation.error as Error).message}</p>
            )}
          </div>
        ) : (
          <Button size="sm" className="w-full" onClick={() => setShowApply(true)}>
            Apply to Join
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function DiscoverClient({ token }: DiscoverClientProps) {
  const [tab, setTab] = useState<TabType>('matches');
  const queryClient = useQueryClient();

  const matchesQuery = useQuery({
    queryKey: ['matches'],
    queryFn: () => api.get<MatchScore[]>('/users/matches?limit=20', token),
    enabled: tab === 'matches',
  });

  const sessionsQuery = useQuery({
    queryKey: ['public-sessions'],
    queryFn: () => fetchPaginated<PublicSession>('/sessions/discover', { limit: 20 }, token),
    enabled: tab === 'sessions',
  });

  const tabs: { key: TabType; label: string }[] = [
    { key: 'matches', label: '🤝 My Matches' },
    { key: 'sessions', label: '🔓 Open Sessions' },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'matches' && (
        <div>
          {matchesQuery.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {matchesQuery.isError && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load matches. Make sure you have skills listed in your profile.</p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/profile">Update Profile →</Link>
              </Button>
            </div>
          )}
          {matchesQuery.data && matchesQuery.data.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No matches yet</p>
              <p className="text-sm mb-4">Add teaching and learning skills to your profile to find matches.</p>
              <Button asChild>
                <Link href="/profile">Update Skills →</Link>
              </Button>
            </div>
          )}
          {matchesQuery.data && matchesQuery.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {matchesQuery.data.map((match) => (
                <MatchCard key={match.userId} match={match} token={token} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div>
          {sessionsQuery.isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          )}
          {sessionsQuery.isError && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load sessions.</p>
            </div>
          )}
          {sessionsQuery.data && sessionsQuery.data.data.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg mb-2">No open sessions right now</p>
              <p className="text-sm mb-4">Be the first to create a public session!</p>
              <Button asChild>
                <a href="/sessions/new">Create Session →</a>
              </Button>
            </div>
          )}
          {sessionsQuery.data && sessionsQuery.data.data.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessionsQuery.data.data.map((session) => (
                <PublicSessionCard
                  key={session.id}
                  session={session}
                  token={token}
                  onApplied={() => void sessionsQuery.refetch()}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
