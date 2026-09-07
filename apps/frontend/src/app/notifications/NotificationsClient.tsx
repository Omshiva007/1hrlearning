'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fetchPaginated } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { Notification } from '@1hrlearning/shared';

export function NotificationsClient({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => fetchPaginated<Notification>('/notifications', { limit: 50 }, token),
  });
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const markOne = useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}/read`, {}, token), onSuccess: refresh });
  const markAll = useMutation({ mutationFn: () => api.patch('/notifications/read-all', {}, token), onSuccess: refresh });
  const remove = useMutation({ mutationFn: (id: string) => api.delete(`/notifications/${id}`, token), onSuccess: refresh });

  if (notifications.isLoading) return <p className="text-muted-foreground">Loading notifications...</p>;
  if (notifications.isError) return <p className="text-destructive">Failed to load notifications.</p>;
  const items = notifications.data?.data ?? [];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
        <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending || items.every((item) => item.isRead)}>Mark all as read</Button>
      </div>
      {items.length === 0 ? <div className="py-16 text-center text-muted-foreground"><p className="text-lg">No notifications yet</p></div> : (
        <div className="space-y-3">{items.map((item) => (
          <Card key={item.id} className={`p-4 ${item.isRead ? '' : 'border-primary bg-primary/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2"><h2 className="font-semibold">{item.title}</h2>{!item.isRead && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">New</span>}</div>
                <p className="mt-1 text-sm text-muted-foreground">{item.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                {!item.isRead && <Button size="sm" variant="outline" onClick={() => markOne.mutate(item.id)}>Read</Button>}
                <Button size="sm" variant="outline" onClick={() => remove.mutate(item.id)}>Delete</Button>
              </div>
            </div>
          </Card>
        ))}</div>
      )}
    </>
  );
}
