import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/metadata';
import { Button } from '@/components/ui/button';
import { SkillCard } from '@/components/skills/SkillCard';
import { fetchPaginated } from '@/lib/api';
import type { Skill } from '@1hrlearning/shared';

export const metadata: Metadata = buildMetadata({
  title: 'Open Knowledge Exchange Platform',
  description:
    'Connect with experts, share your knowledge, and learn something new in an hour. Free non-commercial skill exchange platform.',
});

async function getFeaturedSkills(): Promise<Skill[]> {
  try {
    const result = await fetchPaginated<Skill>('/skills', { limit: 6 });
    return result.data;
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const featuredSkills = await getFeaturedSkills();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Share Knowledge.
            <br />
            <span className="text-primary">Learn in an Hour.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A free, non-commercial platform where you exchange skills directly with other people.
            No money — just knowledge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/skills">Browse Skills</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 bg-muted/50">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '📝', title: 'List Your Skills', description: 'Add the skills you can teach and the skills you want to learn.' },
              { icon: '🤝', title: 'Get Matched', description: 'Our algorithm finds people whose skills complement yours perfectly.' },
              { icon: '🎓', title: 'Exchange Knowledge', description: 'Book a 1-hour session and exchange knowledge directly.' },
            ].map((step, i) => (
              <div key={i} className="text-center p-6 rounded-lg bg-background">
                <div className="text-4xl mb-4">{step.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Skills */}
      {featuredSkills.length > 0 && (
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold">Popular Skills</h2>
              <Button variant="outline" asChild>
                <Link href="/skills">View All →</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSkills.map((skill) => (
                <SkillCard key={skill.id} skill={skill} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Stats */}
      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '100%', label: 'Free Forever' },
              { value: '1hr', label: 'Per Session' },
              { value: '0', label: 'Ads or Fees' },
              { value: '∞', label: 'Skills to Learn' },
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm opacity-80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
