// Read-only operational resources share a consistent, accessible table while mutation-heavy pages use dedicated controls.
'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthContext } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type Props = {
  title: string;
  description: string;
  endpoint: string;
};

function display(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) return value.toLocaleString();
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.map(display).join(', ');
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Relations use their human label; operational tables should never force staff to decode a full object.
    if (typeof record.displayName === 'string') return `${record.displayName}${record.username ? ` (@${record.username})` : ''}`;
    if (typeof record.name === 'string') return record.name;
    // Nested API metrics are flattened into readable labels instead of exposing implementation JSON.
    return Object.entries(record)
      .map(([key, nested]) => `${key.replace(/([A-Z])/g, ' $1')}: ${display(nested)}`)
      .join(' · ');
  }
  return String(value);
}

export function AdminResourcePage({ title, description, endpoint }: Props) {
  const { token } = useAuthContext();
  const query = useQuery({
    queryKey: ['admin-resource', endpoint],
    queryFn: () => apiClient.get<unknown>(endpoint, token ?? undefined),
    enabled: !!token,
  });

  const raw = query.data as Record<string, unknown> | unknown[] | undefined;
  const rows = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : raw
        ? [raw]
        : [];
  const allKeys = [...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>)))];
  const relationKeys = new Set(['teacher', 'learner', 'skill']);
  const keys = allKeys
    // When a populated relation exists, hide its opaque foreign key in favor of the readable object.
    .filter((key) => !(key.endsWith('Id') && relationKeys.has(key.slice(0, -2))))
    .sort((a, b) => Number(relationKeys.has(b)) - Number(relationKeys.has(a)))
    .slice(0, 12);

  const heading = (key: string) => key.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());

  return (
    <div className="p-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-muted-foreground">{description}</p></div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>Refresh</Button>
      </div>
      {query.isLoading && <div className="h-40 animate-pulse rounded-lg border bg-card" />}
      {query.isError && <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-destructive">{query.error.message}</div>}
      {!query.isLoading && !query.isError && rows.length === 0 && <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">No records found.</div>}
      {rows.length > 0 && (
        <div className="overflow-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60"><tr>{keys.map((key) => <th key={key} className="px-4 py-3 text-left font-medium">{heading(key)}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={String((row as Record<string, unknown>).id ?? index)} className="border-t">{keys.map((key) => <td key={key} className="max-w-xs truncate px-4 py-3">{display((row as Record<string, unknown>)[key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
