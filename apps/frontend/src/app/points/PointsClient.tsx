'use client';

import { useQuery } from '@tanstack/react-query';
import { api, fetchPaginated } from '@/lib/api';
import type { PointTransaction } from '@1hrlearning/shared';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PointsClientProps {
  token: string;
}

const TRANSACTION_LABELS: Record<string, { label: string; color: string; sign: string }> = {
  EARNED_TEACHING: { label: 'Earned Teaching', color: 'bg-green-100 text-green-700', sign: '+' },
  SPENT_LEARNING: { label: 'Spent Learning', color: 'bg-red-100 text-red-700', sign: '-' },
  BONUS: { label: 'Bonus', color: 'bg-blue-100 text-blue-700', sign: '+' },
  PENALTY: { label: 'Penalty', color: 'bg-orange-100 text-orange-700', sign: '-' },
  REFUND: { label: 'Refund', color: 'bg-purple-100 text-purple-700', sign: '+' },
};

export function PointsClient({ token }: PointsClientProps) {
  const balanceQuery = useQuery({
    queryKey: ['points-balance'],
    queryFn: () => api.get<{ balance: number }>('/points/balance', token),
  });

  const historyQuery = useQuery({
    queryKey: ['points-history'],
    queryFn: () => fetchPaginated<PointTransaction>('/points/history', { limit: 30 }, token),
  });

  const balance = balanceQuery.data?.balance ?? 0;

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1 bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">💎 {balance}</div>
              <div className="text-sm opacity-80">Current Balance</div>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">How Points Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-green-600 font-medium">+{5} pts</span>
              <span>earned per teaching session completed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 font-medium">-{5} pts</span>
              <span>spent per learning session booked</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium">+10 pts</span>
              <span>welcome bonus on registration</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">5 pts min</span>
              <span>required balance to book a session</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          )}

          {historyQuery.isError && (
            <p className="text-sm text-muted-foreground text-center py-4">Failed to load history.</p>
          )}

          {historyQuery.data?.data.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No transactions yet. Start teaching or learning to earn points!
            </p>
          )}

          {historyQuery.data && historyQuery.data.data.length > 0 && (
            <div className="space-y-2">
              {historyQuery.data.data.map((tx) => {
                const meta = TRANSACTION_LABELS[tx.type] ?? { label: tx.type, color: 'bg-gray-100 text-gray-700', sign: '' };
                const isPositive = tx.amount > 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                      <div>
                        <p className="text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString()} · Balance after: {tx.balanceAfter} pts
                        </p>
                      </div>
                    </div>
                    <div className={`font-semibold text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{tx.amount} pts
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
