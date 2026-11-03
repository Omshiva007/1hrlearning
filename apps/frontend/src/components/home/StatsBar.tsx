// Product promises replace fabricated telemetry until a public metrics endpoint supplies verified values.
'use client';

export function StatsBar() {
  const stats = [
    { value: 'Free', label: 'No payments between users' },
    { value: '1-to-1', label: 'Focused live sessions' },
    { value: 'Mutual', label: 'Teach and learn' },
    { value: 'Private', label: 'Controlled profile visibility' },
  ];

  return (
    <div className="border-b border-border">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`border-b border-r border-border px-3 py-6 text-center lg:border-b-0 ${
              idx % 2 === 1 ? 'border-r-0 lg:border-r' : ''
            } ${
              idx >= stats.length - 2 ? 'border-b-0' : ''
            } ${
              idx === stats.length - 1 ? 'lg:border-r-0' : ''
            }`}
          >
            <div className="text-2xl font-bold tracking-tight text-text-primary">
              {stat.value}
            </div>
            <div className="mt-1 text-xs text-text-secondary">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
