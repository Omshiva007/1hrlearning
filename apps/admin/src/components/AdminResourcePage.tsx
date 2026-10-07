// Placeholder resource pages communicate intentionally unavailable admin modules without inventing behavior.
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
  if (typeof value === 'object') return JSON.stringify(value);
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
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row as Record<string, unknown>)))].slice(0, 10);

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
            <thead className="bg-muted/60"><tr>{keys.map((key) => <th key={key} className="px-4 py-3 text-left font-medium">{key}</th>)}</tr></thead>
            <tbody>{rows.map((row, index) => <tr key={String((row as Record<string, unknown>).id ?? index)} className="border-t">{keys.map((key) => <td key={key} className="max-w-xs truncate px-4 py-3">{display((row as Record<string, unknown>)[key])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
