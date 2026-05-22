'use client';

import { useRouter } from 'next/navigation';

export function Topics() {
  const router = useRouter();
  
  const topics = [
    'Python basics',
    'Accounting',
    'Resume writing',
    'Personal finance',
    'SQL',
    'Public speaking',
    'Excel',
    'Marketing',
    'Interview prep',
    'UI/UX Design',
    'English communication',
  ];

  return (
    <section className="bg-bg-secondary px-10 py-16" id="topics">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-deep">
          Topics
        </p>
        <h2 className="mb-3 font-serif text-4xl font-bold text-text-primary">
          Find your topic
        </h2>
        <p className="text-base text-text-secondary">
          Browse sessions across popular categories.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => router.push('/auth/signup')}
            className="rounded-full border border-border-strong bg-white px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-secondary hover:text-text-primary"
          >
            {topic}
          </button>
        ))}
        <button
          className="rounded-full border border-green-deep bg-white px-4 py-2 text-sm font-semibold text-green-deep transition-colors hover:bg-green-light"
          onClick={() => router.push('/auth/signup')}
        >
          View all topics →
        </button>
      </div>
    </section>
  );
}
