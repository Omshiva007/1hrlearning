// These are verifiable product capabilities, not invented testimonials or ratings.
'use client';

export function Testimonials() {
  const testimonials = [
    {
      quote: 'Declare what you can teach and what you want to learn.', author: 'Reciprocal profiles', role: 'Matching starts with real skills', avatar: '01',
      bg: 'bg-green-light',
      color: 'text-green-dark',
    },
    {
      quote: 'Teach to earn points, then use those points to learn.', author: 'No-money exchange', role: 'A closed learning economy', avatar: '02',
      bg: 'bg-purple-light',
      color: 'text-purple-dark',
    },
    {
      quote: 'See why a person matches before sending a request.', author: 'Explainable discovery', role: 'Skills, availability, and reputation', avatar: '03',
      bg: 'bg-amber-light',
      color: 'text-amber',
    },
    {
      quote: 'Meeting links stay private until a session is confirmed.', author: 'Participant privacy', role: 'Details shared at the right time', avatar: '04',
      bg: 'bg-coral-light',
      color: 'text-coral-dark',
    },
  ];

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-deep">
          Product principles
        </p>
        <h2 className="mb-3 font-serif text-3xl font-bold text-text-primary sm:text-4xl">
          Designed for trustworthy exchange
        </h2>
        <p className="max-w-lg text-base text-text-secondary">
          The platform makes every promise below enforceable in the workflow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {testimonials.map((testimonial, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
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
