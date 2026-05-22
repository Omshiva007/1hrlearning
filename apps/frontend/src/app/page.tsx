import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/metadata';
import { Navigation } from '@/components/layout/Navigation';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from '@/components/home/HeroSection';
import { StatsBar } from '@/components/home/StatsBar';
import { HowItWorks } from '@/components/home/HowItWorks';
import { Features } from '@/components/home/Features';
import { Topics } from '@/components/home/Topics';
import { Testimonials } from '@/components/home/Testimonials';
import { CTASection } from '@/components/home/CTASection';

export const metadata: Metadata = buildMetadata({
  title: 'OKE — Open Knowledge Exchange',
  description:
    'Share what you know. Learn what you do not know. Exchange knowledge with real people through live 1-on-1 sessions. No payments between users. No courses. Just human learning.',
});

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-grow">
        <HeroSection />
        <StatsBar />
        <HowItWorks />
        <section className="bg-bg-secondary">
          <div className="px-10 py-16">
            <div className="grid grid-cols-2 gap-12 items-center">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-deep">
                  Skill matching
                </p>
                <h2 className="mb-3 font-serif text-4xl font-bold text-text-primary">
                  Your perfect learning partner is already here
                </h2>
                <p className="mb-6 max-w-md text-base text-text-secondary">
                  Our matching engine scores every sharer on topic fit, depth, availability, and
                  reputation — so you always see the most relevant people first.
                </p>
              </div>
              <div className="space-y-3">
                {[
                  { avatar: 'PS', name: 'Priya Sharma', teaches: 'Accounting', learns: 'Python', score: '94%' },
                  { avatar: 'MC', name: 'Marcus Chen', teaches: 'Python', learns: 'Public Speaking', score: '87%' },
                  { avatar: 'AO', name: 'Amara Osei', teaches: 'Finance', learns: 'Photography', score: '82%' },
                ].map((match, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white p-4 hover:bg-bg-secondary transition"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-light text-xs font-semibold text-green-dark">
                      {match.avatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-text-primary">{match.name}</p>
                      <div className="flex gap-2 text-xs">
                        <span className="inline-block rounded-full bg-green-light px-2 py-1 text-green-dark">
                          Teaches: {match.teaches}
                        </span>
                        <span className="inline-block rounded-full bg-purple-light px-2 py-1 text-purple-dark">
                          Learns: {match.learns}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green">{match.score}</div>
                      <div className="text-xs text-text-tertiary">match</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <Features />
        <Topics />
        <Testimonials />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
