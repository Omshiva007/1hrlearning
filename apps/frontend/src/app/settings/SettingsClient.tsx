'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SettingsClientProps {
  token: string;
}

interface ProfileSettings {
  isDiscoverable: boolean;
  adEmailOptOut: boolean;
  defaultMeetingProvider?: 'ZOOM' | 'GOOGLE_MEET' | 'CUSTOM';
  defaultMeetingUrl?: string | null;
}

export function SettingsClient({ token }: SettingsClientProps) {
  const queryClient = useQueryClient();

  // Fetch current profile
  const profileQuery = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => api.get<ProfileSettings>('/auth/me', token),
  });

  const adPrefsQuery = useQuery({
    queryKey: ['ad-preferences'],
    queryFn: () => api.get<{ adEmailOptOut: boolean }>('/users/ad-preferences', token),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<ProfileSettings>) => api.put('/users/me', data, token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['my-profile'] }),
  });

  const updateAdPrefsMutation = useMutation({
    mutationFn: (adEmailOptOut: boolean) =>
      api.patch('/users/ad-preferences', { adEmailOptOut }, token),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['ad-preferences'] }),
  });

  const [saved, setSaved] = useState('');
  const [meetingProvider, setMeetingProvider] = useState<'ZOOM' | 'GOOGLE_MEET' | 'CUSTOM'>('ZOOM');
  const [meetingUrl, setMeetingUrl] = useState('');
  const profileData = profileQuery.data as ProfileSettings | undefined;

  useEffect(() => {
    if (!profileData) return;
    setMeetingProvider(profileData.defaultMeetingProvider ?? 'ZOOM');
    setMeetingUrl(profileData.defaultMeetingUrl ?? '');
  }, [profileData?.defaultMeetingProvider, profileData?.defaultMeetingUrl]);

  const handleDiscoverable = async (value: boolean) => {
    await updateProfileMutation.mutateAsync({ isDiscoverable: value });
    setSaved('discoverable');
    setTimeout(() => setSaved(''), 2000);
  };

  const handleAdOptOut = async (value: boolean) => {
    await updateAdPrefsMutation.mutateAsync(value);
    setSaved('ads');
    setTimeout(() => setSaved(''), 2000);
  };

  const handleMeetingSave = async () => {
    await updateProfileMutation.mutateAsync({
      defaultMeetingProvider: meetingProvider,
      defaultMeetingUrl: meetingUrl || null,
    });
    setSaved('meeting');
    setTimeout(() => setSaved(''), 2000);
  };

  const isDiscoverable = (profileQuery.data as { isDiscoverable?: boolean })?.isDiscoverable ?? true;
  const adEmailOptOut = adPrefsQuery.data?.adEmailOptOut ?? false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Default Meeting Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Required to create teaching sessions. You can still override this per session.
          </p>
          <select
            value={meetingProvider}
            onChange={(e) => setMeetingProvider(e.target.value as 'ZOOM' | 'GOOGLE_MEET' | 'CUSTOM')}
            className="w-full border rounded-md px-3 py-2 text-sm"
          >
            <option value="ZOOM">Zoom</option>
            <option value="GOOGLE_MEET">Google Meet</option>
            <option value="CUSTOM">Custom</option>
          </select>
          <input
            type="url"
            placeholder="https://..."
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
          <Button onClick={() => void handleMeetingSave()} disabled={updateProfileMutation.isPending || profileQuery.isLoading}>
            Save Meeting Defaults
          </Button>
          {saved === 'meeting' && <p className="text-xs text-green-600">✓ Meeting defaults saved</p>}
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy & Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Profile Discoverable</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When enabled, users with relevant complementary skills can find your profile in matches.
                Disable to become invisible to the matching system.
              </p>
            </div>
            <button
              onClick={() => void handleDiscoverable(!isDiscoverable)}
              disabled={updateProfileMutation.isPending || profileQuery.isLoading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isDiscoverable ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={isDiscoverable}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                  isDiscoverable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {saved === 'discoverable' && (
            <p className="text-xs text-green-600">✓ Saved</p>
          )}
        </CardContent>
      </Card>

      {/* Ad Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Opt out of skill-interest emails</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We occasionally send emails about new teachers or sessions that match your learning interests.
                No in-app or in-session ads are ever shown. You can opt out of email targeting at any time.
              </p>
            </div>
            <button
              onClick={() => void handleAdOptOut(!adEmailOptOut)}
              disabled={updateAdPrefsMutation.isPending || adPrefsQuery.isLoading}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                adEmailOptOut ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={adEmailOptOut}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                  adEmailOptOut ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {adEmailOptOut && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
              ✓ You are opted out of skill-interest emails. You will still receive transactional emails (session confirmations, notifications).
            </div>
          )}
          {saved === 'ads' && (
            <p className="text-xs text-green-600">✓ Preference saved</p>
          )}
        </CardContent>
      </Card>

      {/* Platform Guarantee */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <p className="text-xs text-blue-700">
            <strong>Our commitment:</strong> 1hrLearning is 100% non-commercial. We never show ads inside sessions, on profile pages, or in the discovery feed.
            Email recommendations are purely skill-interest based — no third-party ad networks, no data selling.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
