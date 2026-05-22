'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface TimeSlot {
  day: string;
  dayNumber: number;
  startTime: string;
  endTime: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function OnboardingAvailabilityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [slots, setSlots] = useState<TimeSlot[]>([
    { day: 'Monday', dayNumber: 1, startTime: '09:00', endTime: '17:00' },
  ]);

  if (status === 'unauthenticated') {
    return <div>Please log in first</div>;
  }

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      { day: DAYS[0], dayNumber: 0, startTime: '09:00', endTime: '17:00' },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSlotChange = (
    index: number,
    field: keyof TimeSlot,
    value: string | number
  ) => {
    setSlots((prev) =>
      prev.map((slot, i) => {
        if (i === index) {
          if (field === 'day') {
            const dayIndex = DAYS.indexOf(value as string);
            return { ...slot, day: value as string, dayNumber: dayIndex };
          }
          return { ...slot, [field]: value };
        }
        return slot;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Create availability slots
      const promises = slots.map((slot) => {
        // Convert day name and time to actual date
        const now = new Date();
        const daysUntilDay = (slot.dayNumber - now.getDay() + 7) % 7 || 7;
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() + daysUntilDay);
        const [startHour, startMin] = slot.startTime.split(':').map(Number);
        startDate.setHours(startHour, startMin, 0, 0);

        const endDate = new Date(startDate);
        const [endHour, endMin] = slot.endTime.split(':').map(Number);
        endDate.setHours(endHour, endMin, 0, 0);

        return fetch('/api/v1/availability', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.accessToken}`,
          },
          body: JSON.stringify({
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
          }),
        });
      });

      const responses = await Promise.all(promises);
      if (!responses.every((r) => r.ok)) {
        throw new Error('Failed to save availability');
      }

      // Mark onboarding as complete
      await fetch('/api/v1/users/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          isOnboardingComplete: true,
        }),
      });

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 4
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-green-500 text-white'
              }`}
            >
              {step < 4 ? '✓' : step}
            </div>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">Step 4 of 4</span>
      </div>

      {/* Form Card */}
      <Card className="p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">When are you available?</h1>
          <p className="text-muted-foreground">
            Set your availability slots so others know when they can book sessions with you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Time slots */}
          <div className="space-y-4">
            {slots.map((slot, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border-2 border-muted bg-muted/30 space-y-3"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Slot {index + 1}</span>
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveSlot(index)}
                      disabled={isLoading}
                      className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* Day selector */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Day</label>
                    <select
                      value={slot.day}
                      onChange={(e) => handleSlotChange(index, 'day', e.target.value)}
                      disabled={isLoading}
                      className="w-full px-2 py-2 rounded border border-input bg-background text-sm disabled:opacity-50"
                    >
                      {DAYS.map((day, dayIndex) => (
                        <option key={dayIndex} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Start time */}
                  <div>
                    <label className="block text-xs font-medium mb-1">Start</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => handleSlotChange(index, 'startTime', e.target.value)}
                      disabled={isLoading}
                      className="w-full px-2 py-2 rounded border border-input bg-background text-sm disabled:opacity-50"
                    />
                  </div>

                  {/* End time */}
                  <div>
                    <label className="block text-xs font-medium mb-1">End</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => handleSlotChange(index, 'endTime', e.target.value)}
                      disabled={isLoading}
                      className="w-full px-2 py-2 rounded border border-input bg-background text-sm disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add slot button */}
          <button
            type="button"
            onClick={handleAddSlot}
            disabled={isLoading}
            className="w-full py-2 px-4 rounded-lg border-2 border-dashed border-muted hover:border-muted-foreground transition-colors text-sm font-medium disabled:opacity-50"
          >
            + Add Another Time Slot
          </button>

          {/* Info box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-900 mb-2">💡 Tip</h3>
            <p className="text-sm text-blue-800">
              You can always edit your availability later. Start with what's most convenient and
              adjust as needed.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-6">
            <Link href="/onboarding/learn-side">
              <Button variant="outline" disabled={isLoading}>
                Back
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost" disabled={isLoading}>
                Skip
              </Button>
            </Link>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || slots.length === 0}
            >
              {isLoading ? 'Saving...' : 'Finish Setup'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
