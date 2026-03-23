import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { buildProfileMetadata } from '@/lib/metadata';
import { buildPersonSchema } from '@/lib/structured-data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getInitials, formatDate } from '@/lib/utils';
import type { PublicUser } from '@1hrlearning/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

async function getUser(username: string): Promise<PublicUser | null> {
  try {
    const res = await fetch(`${API_URL}/users/username/${username}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}): Promise<Metadata> {
  const user = await getUser(params.username);
  if (!user) return { title: 'User not found' };
  return buildProfileMetadata(user);
}

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const user = await getUser(params.username);
  if (!user) notFound();

  const personSchema = buildPersonSchema(user);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="h-24 w-24">
                <AvatarImage src={user.avatarUrl ?? ''} alt={user.displayName} />
                <AvatarFallback className="text-2xl">{getInitials(user.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-2xl font-bold">{user.displayName}</h1>
                  {user.isVerified && <span className="text-blue-500 text-lg" title="Verified">✓</span>}
                </div>
                <p className="text-muted-foreground mb-2">@{user.username}</p>
                {user.bio && <p className="text-sm mb-4 max-w-lg">{user.bio}</p>}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>🎓 {user.totalSessionsTaught} sessions taught</span>
                  <span>📖 {user.totalSessionsLearned} sessions learned</span>
                  {user.averageRating && (
                    <span>⭐ {user.averageRating.toFixed(1)} ({user.ratingCount} ratings)</span>
                  )}
                  <span>📅 Joined {formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Teaching Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">🎓 Can Teach</CardTitle>
            </CardHeader>
            <CardContent>
              {user.teachingSkills.length === 0 ? (
                <p className="text-muted-foreground text-sm">No teaching skills listed</p>
              ) : (
                <div className="space-y-3">
                  {user.teachingSkills.map((us) => (
                    <div key={us.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{us.skill.name}</p>
                        {us.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{us.description}</p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs">{us.level}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Learning Skills */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">📖 Wants to Learn</CardTitle>
            </CardHeader>
            <CardContent>
              {user.learningSkills.length === 0 ? (
                <p className="text-muted-foreground text-sm">No learning goals listed</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {user.learningSkills.map((us) => (
                    <Badge key={us.id} variant="secondary">{us.skill.name}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
