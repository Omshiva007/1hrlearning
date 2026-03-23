import Link from 'next/link';
import type { Session } from '@1hrlearning/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, formatRelativeTime, getInitials } from '@/lib/utils';

interface SessionCardProps {
  session: Session & {
    teacher: { id: string; username: string; displayName: string; avatarUrl: string | null };
    learner: { id: string; username: string; displayName: string; avatarUrl: string | null };
  };
  currentUserId: string;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'secondary',
  CONFIRMED: 'default',
  IN_PROGRESS: 'default',
  COMPLETED: 'outline',
  CANCELLED: 'destructive',
  NO_SHOW: 'destructive',
};

export function SessionCard({ session, currentUserId }: SessionCardProps) {
  const isTeacher = session.teacherId === currentUserId;
  const partner = isTeacher ? session.learner : session.teacher;
  const role = isTeacher ? 'Teaching' : 'Learning';

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={partner.avatarUrl ?? ''} alt={partner.displayName} />
              <AvatarFallback className="text-xs">{getInitials(partner.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{partner.displayName}</p>
              <p className="text-xs text-muted-foreground">@{partner.username}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={STATUS_COLORS[session.status] as 'default' | 'secondary' | 'outline' | 'destructive'}>
              {session.status}
            </Badge>
            <span className="text-xs text-muted-foreground">{role}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{session.skill.name}</span>
          <Badge variant="outline" className="text-xs">{session.skill.category}</Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>📅 {formatDate(session.scheduledAt)}</span>
          <span>⏱ {session.durationMinutes} min</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatRelativeTime(session.createdAt)}</span>
          <Link
            href={`/sessions/${session.id}`}
            className="text-xs text-primary hover:underline"
          >
            View Details →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
