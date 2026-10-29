'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthContext } from '@/lib/auth';
import { Button } from '@/components/ui/button';

type Provider = 'RESEND' | 'SENDGRID' | 'CONSOLE';
type ProviderConfig = {
  provider: Provider; fromEmail: string; fromName: string; credentialHint?: string | null;
  isActive: boolean; isConfigured: boolean; updatedAt: string;
};

const fieldClass = 'w-full rounded-md border bg-background px-3 py-2 text-sm';
const providerDefaults: Record<Provider, { fromEmail: string; fromName: string }> = {
  // Resend's hosted sender supports initial API testing before a custom domain is verified.
  RESEND: { fromEmail: 'onboarding@resend.dev', fromName: '1hrLearning' },
  SENDGRID: { fromEmail: 'noreply@1hrlearning.com', fromName: '1hrLearning' },
  CONSOLE: { fromEmail: 'noreply@1hrlearning.local', fromName: '1hrLearning' },
};

export function EmailProviderPanel() {
  const { token } = useAuthContext(); const queryClient = useQueryClient();
  const [provider, setProvider] = useState<Provider>('RESEND');
  const [fromEmail, setFromEmail] = useState('noreply@1hrlearning.com');
  const [fromName, setFromName] = useState('1hrLearning');
  const [apiKey, setApiKey] = useState(''); const [reason, setReason] = useState('');
  const [recipient, setRecipient] = useState(''); const [message, setMessage] = useState('');
  const query = useQuery({ queryKey: ['admin', 'email-providers'], queryFn: () => apiClient.get<ProviderConfig[]>('/admin/email-providers', token!), enabled: !!token });
  const selected = query.data?.find((item) => item.provider === provider);

  useEffect(() => {
    // Stored values always win; provider-specific defaults keep first-time sandbox setup usable.
    const values = selected ?? providerDefaults[provider];
    setFromEmail(values.fromEmail); setFromName(values.fromName); setApiKey('');
  }, [provider, selected]);

  const save = useMutation({
    mutationFn: () => apiClient.put('/admin/email-providers', { provider, fromEmail, fromName, ...(apiKey && { apiKey }), activate: true, reason }, token!),
    onSuccess: async () => { setApiKey(''); setReason(''); setMessage(`${provider} is now the active email provider.`); await queryClient.invalidateQueries({ queryKey: ['admin', 'email-providers'] }); },
  });
  const test = useMutation({
    mutationFn: () => apiClient.post<{ provider: Provider }>('/admin/email-providers/test', { provider, recipient }, token!),
    onSuccess: (result) => setMessage(`Test email processed by ${result.provider}. Check the destination inbox and provider activity log.`),
  });
  const error = save.error?.message ?? test.error?.message ?? query.error?.message;
  const submit = (event: FormEvent) => { event.preventDefault(); setMessage(''); save.mutate(); };

  return <section className="space-y-5 rounded-lg border bg-card p-5" aria-labelledby="email-provider-heading">
    <div><h2 id="email-provider-heading" className="text-xl font-semibold">Transactional email provider</h2><p className="text-sm text-muted-foreground">Switch between configured providers without a deployment. API keys are encrypted and never returned to the browser.</p></div>
    {error && <p role="alert" className="rounded border border-destructive p-3 text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="rounded border border-emerald-600 p-3 text-sm text-emerald-700">{message}</p>}
    <div className="grid gap-3 md:grid-cols-3">{(['RESEND','SENDGRID','CONSOLE'] as Provider[]).map((item) => { const record=query.data?.find(row=>row.provider===item); return <button type="button" key={item} onClick={()=>setProvider(item)} className={`rounded-lg border p-4 text-left ${provider===item?'ring-2 ring-primary':''}`}><span className="font-semibold">{item}</span><span className="mt-1 block text-xs text-muted-foreground">{record?.isActive?'Active':record?.isConfigured?`Configured · key …${record.credentialHint}`:item==='CONSOLE'?'Local logging only':'Not configured'}</span></button>; })}</div>
    <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-1 text-sm font-medium">From name<input className={fieldClass} required maxLength={100} value={fromName} onChange={(e)=>setFromName(e.target.value)}/></label>
      <label className="grid gap-1 text-sm font-medium">From email<input className={fieldClass} required type="email" value={fromEmail} onChange={(e)=>setFromEmail(e.target.value)}/><span className="font-normal text-muted-foreground">{provider==='RESEND'?'Use onboarding@resend.dev for initial tests, then replace it here after verifying your real domain.':'This sender must be authorized by the selected provider.'}</span></label>
      {provider!=='CONSOLE' && <label className="grid gap-1 text-sm font-medium md:col-span-2">API key<input className={fieldClass} type="password" autoComplete="new-password" placeholder={selected?.isConfigured?'Leave blank to preserve the encrypted key':'Required for first configuration'} required={!selected?.isConfigured} value={apiKey} onChange={(e)=>setApiKey(e.target.value)}/><span className="font-normal text-muted-foreground">The existing key cannot be viewed or recovered from this panel.</span></label>}
      <label className="grid gap-1 text-sm font-medium md:col-span-2">Change reason<textarea className={fieldClass} required minLength={5} maxLength={500} value={reason} onChange={(e)=>setReason(e.target.value)}/></label>
      <Button className="md:col-span-2" disabled={save.isPending || query.isLoading}>Save and activate {provider}</Button>
    </form>
    <form className="flex flex-wrap items-end gap-3 border-t pt-4" onSubmit={(event)=>{event.preventDefault();setMessage('');test.mutate();}}>
      <label className="grid min-w-64 flex-1 gap-1 text-sm font-medium">Test recipient<input className={fieldClass} required type="email" value={recipient} onChange={(e)=>setRecipient(e.target.value)}/><span className="font-normal text-muted-foreground">A random Mailinator address is suitable for non-sensitive tests. Public inboxes must never receive passwords, tokens, meeting links, or personal data.</span></label>
      <Button variant="outline" disabled={test.isPending || !selected?.isConfigured}>Send test through {provider}</Button>
    </form>
  </section>;
}
