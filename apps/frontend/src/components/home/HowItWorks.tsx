'use client';

export function HowItWorks() {
  const steps = [
    {
      num: '1',
      icon: '👤',
      title: 'Build your profile',
      desc: 'Declare what you can share and what you want to learn. Set your availability.',
      bg: 'bg-green-light',
      bgColor: 'bg-green-light',
      textColor: 'text-green-dark',
    },
    {
      num: '2',
      icon: '⚙️',
      title: 'Get smart matches',
      desc: 'Our engine scores sharers by topic fit, availability, and reputation.',
      bg: 'bg-purple-light',
      bgColor: 'bg-purple-light',
      textColor: 'text-purple-dark',
    },
    {
      num: '3',
      icon: '📅',
      title: 'Book a live session',
      desc: 'Express interest, get approved, and your session is added to your calendar.',
      bg: 'bg-amber-light',
      bgColor: 'bg-amber-light',
      textColor: 'text-amber',
    },
    {
      num: '4',
      icon: '🔄',
      title: 'Share to keep learning',
      desc: 'Teach what you know to earn points. Use points to book more sessions.',
      bg: 'bg-coral-light',
      bgColor: 'bg-coral-light',
      textColor: 'text-coral-dark',
    },
  ];

  return (
    <section className="px-10 py-16" id="how-it-works">
      <div className="mb-8">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-deep">
          How it works
        </p>
        <h2 className="mb-3 font-serif text-4xl font-bold text-text-primary">
          Four steps to your first session
        </h2>
        <p className="max-w-lg text-base text-text-secondary">
          Takes less than 5 minutes to set up. Start learning from real people today.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {steps.map((step) => (
          <div
            key={step.num}
            className="rounded-2xl border border-border bg-white p-5 shadow-sm"
          >
            <div
              className={`${step.bgColor} ${step.textColor} mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg`}
            >
              {step.icon}
            </div>
            <p className="mb-2 text-xs font-semibold text-text-tertiary">Step {step.num}</p>
            <h3 className="mb-2 font-semibold text-text-primary">{step.title}</h3>
            <p className="text-sm leading-relaxed text-text-secondary">{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
