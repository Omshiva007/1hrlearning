import Link from 'next/link';
import type { PublicUser } from '@1hrlearning/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/lib/utils';

interface ProfileCardProps {
  user: PublicUser;
  showConnectButton?: boolean;
}

export function ProfileCard({ user, showConnectButton = false }: ProfileCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl ?? ''} alt={user.displayName} />
            <AvatarFallback className="text-lg">{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg truncate">{user.displayName}</h3>
              {user.isVerified && <span title="Verified" className="text-blue-500">✓</span>}
            </div>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
            {user.averageRating && (
              <div className="flex items-center gap-1 mt-1">
                <span className="text-yellow-400 text-sm">★</span>
                <span className="text-sm font-medium">{user.averageRating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({user.ratingCount})</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {user.bio && (
          <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
        )}

        {user.teachingSkills.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Can teach</p>
            <div className="flex flex-wrap gap-1">
              {user.teachingSkills.slice(0, 3).map((us) => (
                <Badge key={us.id} variant="secondary" className="text-xs">
                  {us.skill.name}
                </Badge>
              ))}
              {user.teachingSkills.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{user.teachingSkills.length - 3}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>🎓 {user.totalSessionsTaught} taught</span>
            <span>📖 {user.totalSessionsLearned} learned</span>
          </div>
          {showConnectButton && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/profile/${user.username}`}>View Profile</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
