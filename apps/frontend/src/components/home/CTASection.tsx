'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function CTASection() {
  const router = useRouter();

  return (
    <section className="bg-green px-10 py-20 text-center">
      <h2 className="mb-3 font-serif text-4xl font-bold text-green-light">
        Ready to start exchanging knowledge?
      </h2>
      <p className="mb-8 text-base leading-relaxed text-green-mid">
        Sign up free. Get 10 points on day one. Book your first session today.
      </p>
      <div className="flex justify-center gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push('/auth/register')}
          className="font-semibold"
        >
          Sign up and start learning →
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="border-green-mid text-green-light hover:bg-white/10"
        >
          Become a founding sharer
        </Button>
      </div>
    </section>
  );
}
