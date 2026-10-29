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
      <div className="grid grid-cols-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`border-r border-border py-6 text-center ${
              idx === stats.length - 1 ? 'border-r-0' : ''
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
