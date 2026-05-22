'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const router = useRouter();

  return (
    <section className="grid grid-cols-2 gap-0 bg-amber-light/20">
      {/* Left Side */}
      <div className="flex flex-col justify-center px-16 py-24">
        {/* Eyebrow */}
        <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-green-light px-4 py-2">
          <span className="text-xs font-semibold text-green-dark">
            💡 Everyone has something to teach
          </span>
        </div>

        {/* Headline */}
        <h1 className="mb-4 font-serif text-5xl font-bold leading-tight text-text-primary">
          Share what you know.<br />
          <span className="text-green">Learn what you don&apos;t.</span>
        </h1>

        {/* Subheading */}
        <p className="mb-8 max-w-md text-base leading-relaxed text-text-secondary">
          Exchange knowledge with real people through live 1-on-1 sessions. No payments
          between users. No courses. Just human learning.
        </p>

        {/* CTA Buttons */}
        <div className="mb-8 flex gap-3">
          <Button
            size="lg"
            onClick={() => router.push('/auth/signup')}
            className="font-semibold"
          >
            Start learning free →
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() =>
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="font-semibold"
          >
            See how it works
          </Button>
        </div>

        {/* Social Proof */}
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card bg-green-light text-xs font-semibold text-green-dark">
              AR
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card bg-purple-light text-xs font-semibold text-purple-dark">
              SM
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card bg-amber-light text-xs font-semibold text-amber">
              PK
            </div>
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg-card bg-coral-light text-xs font-semibold text-coral-dark">
              DL
            </div>
          </div>
          <span className="text-xs text-text-secondary">
            <strong className="text-text-primary">2,400+ learners</strong> already exchanging
            knowledge
          </span>
        </div>
      </div>

      {/* Right Side - Illustration Placeholder */}
      <div className="relative flex items-center justify-center bg-amber-light/30">
        <div className="relative h-80 w-80 rounded-3xl bg-amber-light/50">
          {/* Placeholder illustration */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="mb-4 text-5xl">👥</div>
              <p className="text-sm font-semibold text-text-primary">Two people learning together</p>
            </div>
          </div>

          {/* Floating badge - Match score */}
          <div className="absolute right-6 top-6 rounded-lg border border-border bg-white p-3 shadow-md">
            <div className="mb-1 text-xs text-text-secondary">Match score</div>
            <div className="text-2xl font-bold text-green">94%</div>
          </div>

          {/* Floating badge - Sessions */}
          <div className="absolute bottom-6 left-6 rounded-lg border border-border bg-white p-3 shadow-md">
            <div className="mb-1 text-xs text-text-secondary">Sessions this week</div>
            <div className="text-2xl font-bold text-text-primary">128</div>
          </div>
        </div>
      </div>
    </section>
  );
}
