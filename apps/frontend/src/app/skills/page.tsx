import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import { SkillCard } from '@/components/skills/SkillCard';
import { fetchPaginated } from '@/lib/api';
import type { Skill } from '@1hrlearning/shared';
import { SKILL_CATEGORIES } from '@1hrlearning/shared';

export const metadata: Metadata = buildMetadata({
  title: 'Browse Skills',
  description:
    'Discover hundreds of skills you can learn or teach on 1hrLearning. Technology, design, languages, music and more.',
});

interface PageProps {
  searchParams: { q?: string; category?: string; page?: string };
}

async function getSkills(params: Record<string, string>): Promise<{
  data: Skill[];
  pagination: { total: number; totalPages: number; page: number };
}> {
  try {
    return await fetchPaginated<Skill>('/skills', { ...params, limit: 24 });
  } catch {
    return { data: [], pagination: { total: 0, totalPages: 0, page: 1 } };
  }
}

export default async function SkillsPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page ?? 1);
  const params = {
    ...(searchParams.q ? { q: searchParams.q } : {}),
    ...(searchParams.category ? { category: searchParams.category } : {}),
    page,
  };

  const { data: skills, pagination } = await getSkills(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Browse Skills</h1>
        <p className="text-muted-foreground">
          {pagination.total} skills available — find what you want to learn or teach
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <a
          href="/skills"
          className={`px-3 py-1 rounded-full text-sm border transition-colors ${
            !searchParams.category ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
        >
          All
        </a>
        {SKILL_CATEGORIES.map((cat) => (
          <a
            key={cat}
            href={`/skills?category=${encodeURIComponent(cat)}`}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              searchParams.category === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            {cat}
          </a>
        ))}
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No skills found</p>
          <p className="text-sm">Try a different search or category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {skills.map((skill) => (
            <SkillCard key={skill.id} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
