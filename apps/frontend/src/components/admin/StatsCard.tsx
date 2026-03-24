interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  description?: string;
}

export function StatsCard({ title, value, icon, description }: StatsCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <span className="text-2xl">{icon}</span>
      </div>
      <p className="text-3xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
    </div>
  );
}
