import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { buildSkillMetadata } from '@/lib/metadata';
import { buildCourseSchema, safeJsonLd } from '@/lib/structured-data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import type { Skill } from '@1hrlearning/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function getSkill(id: string): Promise<Skill | null> {
  try {
    const res = await fetch(`${API_URL}/skills/${id}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    return null;
  }
}

async function getTeachers(skillId: string) {
  try {
    const res = await fetch(`${API_URL}/skills/${skillId}/teachers?limit=6`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const { data } = await res.json();
    return data;
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const skill = await getSkill(id);
  if (!skill) return { title: 'Skill not found' };
  return buildSkillMetadata(skill);
}

export default async function SkillDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [skill, teachers] = await Promise.all([getSkill(id), getTeachers(id)]);
  if (!skill) notFound();

  const courseSchema = buildCourseSchema({ ...skill, slug: skill.slug });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(courseSchema) }}
      />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-2">
          <Link href="/skills" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Skills
          </Link>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-4">
              <div>
                <h1 className="text-3xl font-bold mb-2">{skill.name}</h1>
                <div className="flex gap-2 flex-wrap">
                  <Badge>{skill.category}</Badge>
                  {skill.subcategory && <Badge variant="outline">{skill.subcategory}</Badge>}
                </div>
              </div>
            </div>

            {skill.description && (
              <p className="text-muted-foreground mb-6">{skill.description}</p>
            )}

            <div className="flex gap-6 text-sm text-muted-foreground mb-8">
              <span>👥 {skill.userCount} users</span>
              <span>📚 {skill.sessionCount} sessions completed</span>
            </div>

            <Button asChild>
              <Link href={`/register?skill=${skill.id}`}>
                Learn {skill.name} →
              </Link>
            </Button>
          </div>

          {teachers.length > 0 && (
            <div className="w-full md:w-72">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Available Teachers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {teachers.map((t: {
                    id: string;
                    level: string;
                    user: { id: string; username: string; displayName: string; avatarUrl: string | null; averageRating: number | null };
                  }) => (
                    <Link key={t.id} href={`/profile/${t.user.username}`} className="flex items-center gap-3 hover:bg-muted rounded-md p-2 transition-colors">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={t.user.avatarUrl ?? ''} alt={t.user.displayName} />
                        <AvatarFallback className="text-xs">{getInitials(t.user.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.user.displayName}</p>
                        <p className="text-xs text-muted-foreground">{t.level}</p>
                      </div>
                      {t.user.averageRating && (
                        <span className="text-xs text-muted-foreground">⭐ {t.user.averageRating.toFixed(1)}</span>
                      )}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
