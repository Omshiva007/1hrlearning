'use client';

export function Features() {
  const features = [
    {
      icon: '⚙️',
      title: 'Smart matching',
      desc: 'Scored on topic, availability, and reputation. You always see the most relevant sharers first.',
      bgColor: 'bg-green-light',
      textColor: 'text-green-dark',
    },
    {
      icon: '👥',
      title: 'Live 1-on-1 sessions',
      desc: 'No crowded classrooms. Learn directly from someone who knows the topic.',
      bgColor: 'bg-purple-light',
      textColor: 'text-purple-dark',
    },
    {
      icon: '📅',
      title: 'Calendar integration',
      desc: 'Sessions added to your calendar. Meeting link revealed on confirmation.',
      bgColor: 'bg-amber-light',
      textColor: 'text-amber',
    },
    {
      icon: '🔔',
      title: 'Smart notifications',
      desc: 'Get notified when a match joins or a public session opens on your topic.',
      bgColor: 'bg-coral-light',
      textColor: 'text-coral-dark',
    },
    {
      icon: '⭐',
      title: 'Ratings and testimonials',
      desc: 'Build your reputation through session reviews and depth-level breakdowns.',
      bgColor: 'bg-green-light',
      textColor: 'text-green-dark',
    },
    {
      icon: '📋',
      title: 'Public session board',
      desc: 'Sharers post open sessions. Learners see seat availability and request to join.',
      bgColor: 'bg-purple-light',
      textColor: 'text-purple-dark',
    },
  ];

  return (
    <section className="px-10 py-16">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-deep">
          Features
        </p>
        <h2 className="mb-3 font-serif text-4xl font-bold text-text-primary">
          Everything you need to learn and teach
        </h2>
        <p className="max-w-lg text-base text-text-secondary">
          Built for genuine human connection, not passive content consumption.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div
              className={`${feature.bgColor} ${feature.textColor} mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg`}
            >
              {feature.icon}
            </div>
            <h3 className="mb-2 font-semibold text-text-primary">{feature.title}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{feature.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
