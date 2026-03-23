import Link from 'next/link';
import type { Skill } from '@1hrlearning/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SkillCardProps {
  skill: Skill;
}

export function SkillCard({ skill }: SkillCardProps) {
  return (
    <Link href={`/skills/${skill.id}`} className="block group">
      <Card className="h-full transition-shadow hover:shadow-md group-hover:border-primary/50">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{skill.name}</CardTitle>
            <Badge variant="secondary" className="shrink-0 text-xs">
              {skill.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {skill.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{skill.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>👥 {skill.userCount} users</span>
            <span>📚 {skill.sessionCount} sessions</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
