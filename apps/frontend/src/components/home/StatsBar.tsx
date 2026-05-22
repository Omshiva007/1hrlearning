'use client';

export function StatsBar() {
  const stats = [
    { value: '2,400+', label: 'Sessions completed' },
    { value: '840', label: 'Active sharers' },
    { value: '38', label: 'Topics covered' },
    { value: '4.8★', label: 'Average rating' },
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
