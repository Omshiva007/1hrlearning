'use client';

export function Testimonials() {
  const testimonials = [
    {
      quote:
        '"Got more clarity on double-entry accounting in 45 minutes than from 3 hours of YouTube videos."',
      author: 'Arjun R.',
      role: 'Learned: Accounting basics',
      avatar: 'AR',
      bg: 'bg-green-light',
      color: 'text-green-dark',
    },
    {
      quote:
        '"I taught Python and earned enough points to learn personal finance. The exchange model just works."',
      author: 'Sana M.',
      role: 'Shared: Python · Learned: Finance',
      avatar: 'SM',
      bg: 'bg-purple-light',
      color: 'text-purple-dark',
    },
    {
      quote:
        '"The person who helped with my resume had real HR experience. It felt like a mentor, not a tutorial."',
      author: 'Priya K.',
      role: 'Learned: Resume writing',
      avatar: 'PK',
      bg: 'bg-amber-light',
      color: 'text-amber',
    },
    {
      quote:
        '"Never thought I had anything worth teaching. Turns out people really wanted to learn Excel from me."',
      author: 'Daniel L.',
      role: 'Shared: Excel',
      avatar: 'DL',
      bg: 'bg-coral-light',
      color: 'text-coral-dark',
    },
  ];

  return (
    <section className="px-10 py-16">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-deep">
          Social proof
        </p>
        <h2 className="mb-3 font-serif text-4xl font-bold text-text-primary">
          What people are saying
        </h2>
        <p className="max-w-lg text-base text-text-secondary">
          Real sessions. Real people. Real learning.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div className="mb-3 text-sm">★★★★★</div>
            <p className="mb-4 font-serif text-sm italic text-text-primary">
              {testimonial.quote}
            </p>
            <div className="flex items-center gap-3">
              <div
                className={`${testimonial.bg} ${testimonial.color} flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold`}
              >
                {testimonial.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{testimonial.author}</p>
                <p className="text-xs text-text-secondary">{testimonial.role}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
