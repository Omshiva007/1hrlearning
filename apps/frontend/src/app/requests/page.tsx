'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

type TabType = 'incoming' | 'outgoing';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

interface Request {
  id: string;
  status: string;
  skill: { name: string };
  scheduledAt?: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string;
  };
}

export default function RequestsPage() {
  const { data: session, status } = useSession();
  const [tab, setTab] = useState<TabType>('incoming');

  const incomingQuery = useQuery({
    queryKey: ['requests:incoming'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/sessions?role=teacher&status=PENDING`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load requests');
      return res.json();
    },
    enabled: tab === 'incoming' && !!session?.accessToken,
  });

  const outgoingQuery = useQuery({
    queryKey: ['requests:outgoing'],
    queryFn: async () => {
      const res = await fetch(`${BACKEND_URL}/sessions?role=learner&status=PENDING`, {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to load requests');
      return res.json();
    },
    enabled: tab === 'outgoing' && !!session?.accessToken,
  });

  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto py-8 text-center">
        <p className="mb-4">Please log in to view your requests</p>
      </div>
    );
  }

  const requests = tab === 'incoming' ? incomingQuery.data?.data || [] : outgoingQuery.data?.data || [];
  const isLoading = tab === 'incoming' ? incomingQuery.isLoading : outgoingQuery.isLoading;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Session Requests</h1>
        <p className="text-muted-foreground">Manage your learning session requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b">
        {['incoming', 'outgoing'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as TabType)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'incoming' ? 'Incoming Requests' : 'My Requests'}
          </button>
        ))}
      </div>

      {/* Requests list */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No {tab === 'incoming' ? 'incoming' : 'outgoing'} requests yet
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request: Request) => (
            <Card key={request.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <Avatar className="w-10 h-10">
                    {request.user.avatarUrl && (
                      <img src={request.user.avatarUrl} alt={request.user.displayName} />
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <Link href={`/profile/${request.user.username}`} className="font-semibold hover:underline">
                      {request.user.displayName}
                    </Link>
                    <p className="text-sm text-muted-foreground">wants to learn {request.skill.name}</p>
                    {request.scheduledAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.scheduledAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Badge>{request.status}</Badge>
                  <Link href={`/sessions/${request.id}`}>
                    <Button size="sm" variant="outline">
                      {tab === 'incoming' ? 'Review' : 'Details'}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
