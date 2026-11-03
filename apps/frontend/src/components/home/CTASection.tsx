// The final call to action sends visitors into the primary account-creation conversion path.
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function CTASection() {
  const router = useRouter();

  return (
    <section className="bg-green px-4 py-16 text-center sm:px-6 sm:py-20 lg:px-10">
      <h2 className="mb-3 font-serif text-3xl font-bold text-green-light sm:text-4xl">
        Ready to start exchanging knowledge?
      </h2>
      <p className="mb-8 text-base leading-relaxed text-green-mid">
        Sign up free. Get 10 points on day one. Book your first session today.
      </p>
      <div className="mx-auto flex max-w-md flex-col justify-center gap-3 sm:max-w-none sm:flex-row">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => router.push('/auth/register')}
          className="w-full font-semibold sm:w-auto"
        >
          Sign up and start learning →
        </Button>
        <Button
          variant="outline"
          size="lg"
          // Both entry points create an account, while onboarding then explicitly captures teaching skills.
          onClick={() => router.push('/register')}
          className="w-full border-white bg-white font-semibold text-green-dark hover:bg-green-light hover:text-green-dark sm:w-auto"
        >
          Become a founding sharer
        </Button>
      </div>
    </section>
  );
}
