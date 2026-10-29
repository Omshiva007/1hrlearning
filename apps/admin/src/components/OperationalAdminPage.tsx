'use client';

import { FormEvent, isValidElement, ReactNode, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient, fetchPaginated } from '@/lib/api-client';
import { useAuthContext } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { EmailProviderPanel } from '@/components/EmailProviderPanel';

type Mode = 'sessions' | 'points' | 'moderation' | 'config' | 'audit' | 'analytics' | 'ads';
type RecordValue = Record<string, unknown>;

const labels: Record<Mode, [string, string]> = {
  sessions: ['Sessions', 'Review learning sessions and apply exceptional, audited overrides.'],
  points: ['Point Economy', 'Monitor supply and change point rules with an audit reason.'],
  moderation: ['Moderation', 'Review reported content and record a resolution decision.'],
  config: ['Platform Configuration', 'Manage supported runtime controls with an audit reason.'],
  audit: ['Audit Log', 'Filter administrative changes and inspect their before/after evidence.'],
  analytics: ['Analytics', 'Inspect activation, sessions, matching, and point-economy outcomes.'],
  ads: ['Recommendations', 'Create and manage first-party recommendations outside profiles and sessions.'],
};

function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());
}

function show(value: unknown): ReactNode {
  if (value == null || value === '') return '—';
  // Action cells contain React elements; traversing their internal owner graph would recurse indefinitely.
  if (isValidElement(value)) return value;
  if (Array.isArray(value)) return value.map(show).join(', ');
  if (typeof value === 'object') {
    const row = value as RecordValue;
    if (row.displayName) return `${row.displayName}${row.username ? ` (@${row.username})` : ''}`;
    if (row.name) return String(row.name);
    return Object.entries(row).map(([key, item]) => `${humanize(key)}: ${show(item)}`).join(' · ');
  }
  return String(value);
}

function Notice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return <p role={error ? 'alert' : 'status'} className={`rounded border p-3 text-sm ${error ? 'border-destructive text-destructive' : 'border-emerald-600 text-emerald-700'}`}>{error ?? success}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-medium"><span>{label}</span>{children}</label>;
}

const inputClass = 'rounded-md border bg-background px-3 py-2 text-sm';

function Table({ rows, columns }: { rows: RecordValue[]; columns: string[] }) {
  if (!rows.length) return <p className="rounded-lg border bg-card p-8 text-center text-muted-foreground">No records match the current filters.</p>;
  return <div className="overflow-auto rounded-lg border bg-card"><table className="w-full text-sm"><thead className="bg-muted/60"><tr>{columns.map((key) => <th key={key} className="px-4 py-3 text-left font-medium">{humanize(key)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr className="border-t" key={String(row.id ?? index)}>{columns.map((key) => <td key={key} className="max-w-sm px-4 py-3 align-top">{show(row[key])}</td>)}</tr>)}</tbody></table></div>;
}

function PageFrame({ mode, children }: { mode: Mode; children: React.ReactNode }) {
  const [title, description] = labels[mode];
  return <main className="space-y-6 p-8"><header><h1 className="text-3xl font-bold">{title}</h1><p className="mt-1 text-muted-foreground">{description}</p></header>{children}</main>;
}

function SessionsPage() {
  const { token } = useAuthContext(); const qc = useQueryClient();
  const [status, setStatus] = useState(''); const [type, setType] = useState(''); const [selected, setSelected] = useState('');
  const [action, setAction] = useState(''); const [reason, setReason] = useState(''); const [confirmed, setConfirmed] = useState(false); const [success, setSuccess] = useState('');
  const query = useQuery({ queryKey: ['ops', 'sessions', status, type], queryFn: () => fetchPaginated<RecordValue>('/admin/sessions', { limit: 100, ...(status && { status }), ...(type && { type }) }, token!), enabled: !!token });
  const mutation = useMutation({ mutationFn: () => apiClient.post(`/admin/sessions/${selected}/override`, { action, reason }, token!), onSuccess: async () => { setSuccess('Session override applied and recorded in the audit log.'); setSelected(''); setReason(''); setConfirmed(false); await qc.invalidateQueries({ queryKey: ['ops', 'sessions'] }); } });
  const rows = query.data?.data ?? [];
  return <PageFrame mode="sessions"><div className="flex flex-wrap gap-3"><Field label="Status"><select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option>{['PENDING','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW','RATED'].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Type"><select className={inputClass} value={type} onChange={(e)=>setType(e.target.value)}><option value="">All</option><option value="private">Private</option><option value="public">Public</option></select></Field></div><Notice error={query.error?.message ?? mutation.error?.message} success={success}/><Table rows={rows.map(row => ({...row, select: <Button variant="outline" onClick={()=>{setSelected(String(row.id));setSuccess('');}}>Manage</Button>}))} columns={['teacher','learner','skill','status','scheduledAt','pointsTransferred','select']}/>{selected && <form className="grid gap-4 rounded-lg border p-5" onSubmit={(e)=>{e.preventDefault();mutation.mutate();}}><h2 className="text-lg font-semibold">Override selected session</h2><Field label="Action"><select required className={inputClass} value={action} onChange={(e)=>setAction(e.target.value)}><option value="">Select an action</option>{['MANUALLY_COMPLETE','CANCEL','OVERRIDE_NO_SHOW_LEARNER','OVERRIDE_NO_SHOW_SHARER','REVERSE_POINTS'].map(v=><option key={v}>{humanize(v)}</option>)}</select></Field><Field label="Reason (minimum 5 characters)"><textarea required minLength={5} className={inputClass} value={reason} onChange={(e)=>setReason(e.target.value)}/></Field><label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(e)=>setConfirmed(e.target.checked)}/>I reviewed the session and understand this action changes user state or points.</label><div className="flex gap-2"><Button disabled={!confirmed || mutation.isPending}>Apply override</Button><Button type="button" variant="outline" onClick={()=>setSelected('')}>Cancel</Button></div></form>}</PageFrame>;
}

function ConfigEditor({ mode }: { mode: 'points' | 'config' }) {
  const { token } = useAuthContext(); const qc = useQueryClient(); const endpoint = mode === 'points' ? '/admin/points/config' : '/admin/config';
  const [key, setKey] = useState(''); const [value, setValue] = useState(''); const [reason, setReason] = useState(''); const [success, setSuccess] = useState('');
  const configs = useQuery({ queryKey:['ops',mode,'config'], queryFn:()=>apiClient.get<RecordValue[]>(endpoint,token!), enabled:!!token });
  const economy = useQuery({ queryKey:['ops','economy'], queryFn:()=>apiClient.get<RecordValue>('/admin/points/economy',token!), enabled:!!token && mode==='points' });
  const mutation = useMutation({ mutationFn:()=>apiClient.patch(endpoint,{key,value:mode==='points'?Number(value):value,reason},token!), onSuccess:async()=>{setSuccess('Configuration saved and audit evidence created.');setReason('');await qc.invalidateQueries({queryKey:['ops',mode]});} });
  const select = (row:RecordValue)=>{setKey(String(row.key));setValue(String(row.value));setSuccess('');};
  return <PageFrame mode={mode}>{mode==='config' && <EmailProviderPanel/>}{mode==='points' && economy.data && <Table rows={[economy.data]} columns={Object.keys(economy.data)}/>}<Notice error={configs.error?.message ?? mutation.error?.message} success={success}/><Table rows={(configs.data??[]).map(row=>({...row,edit:<Button variant="outline" onClick={()=>select(row)}>Edit</Button>}))} columns={['key','value','description','isOverridden','edit']}/>{key && <form className="grid gap-4 rounded-lg border p-5" onSubmit={(e)=>{e.preventDefault();mutation.mutate();}}><h2 className="font-semibold">Edit {humanize(key)}</h2><Field label="Value"><input required className={inputClass} type={mode==='points'?'number':'text'} min={mode==='points'?0:undefined} value={value} onChange={(e)=>setValue(e.target.value)}/></Field><Field label="Reason (minimum 5 characters)"><textarea required minLength={5} className={inputClass} value={reason} onChange={(e)=>setReason(e.target.value)}/></Field><Button disabled={mutation.isPending}>Save audited change</Button></form>}</PageFrame>;
}

function ModerationPage() {
  const {token}=useAuthContext(); const qc=useQueryClient(); const [status,setStatus]=useState('OPEN'); const [selected,setSelected]=useState(''); const [decision,setDecision]=useState('RESOLVED'); const [note,setNote]=useState(''); const [success,setSuccess]=useState('');
  const query=useQuery({queryKey:['ops','flags',status],queryFn:()=>fetchPaginated<RecordValue>('/admin/moderation/flags',{limit:100,status},token!),enabled:!!token});
  const mutation=useMutation({mutationFn:()=>apiClient.patch(`/admin/moderation/flags/${selected}/resolve`,{status:decision,resolutionNote:note||null},token!),onSuccess:async()=>{setSuccess('Moderation decision recorded.');setSelected('');setNote('');await qc.invalidateQueries({queryKey:['ops','flags']});}});
  return <PageFrame mode="moderation"><Field label="Status"><select className={inputClass} value={status} onChange={(e)=>setStatus(e.target.value)}>{['OPEN','RESOLVED','DISMISSED'].map(v=><option key={v}>{v}</option>)}</select></Field><Notice error={query.error?.message??mutation.error?.message} success={success}/><Table rows={(query.data?.data??[]).map(row=>({...row,review:row.status==='OPEN'?<Button variant="outline" onClick={()=>setSelected(String(row.id))}>Review</Button>:'—'}))} columns={['reporter','targetType','targetId','reason','status','createdAt','review']}/>{selected&&<form className="grid gap-4 rounded-lg border p-5" onSubmit={(e)=>{e.preventDefault();mutation.mutate();}}><Field label="Decision"><select className={inputClass} value={decision} onChange={(e)=>setDecision(e.target.value)}><option>RESOLVED</option><option>DISMISSED</option></select></Field><Field label="Resolution note"><textarea className={inputClass} maxLength={500} value={note} onChange={(e)=>setNote(e.target.value)}/></Field><Button disabled={mutation.isPending}>Record decision</Button></form>}</PageFrame>;
}

function AuditPage() {
  const {token}=useAuthContext(); const [targetType,setTargetType]=useState(''); const query=useQuery({queryKey:['ops','audit',targetType],queryFn:()=>fetchPaginated<RecordValue>('/admin/audit-log',{limit:100,...(targetType&&{targetType})},token!),enabled:!!token});
  return <PageFrame mode="audit"><Field label="Target type"><input className={inputClass} placeholder="e.g. SESSION" value={targetType} onChange={(e)=>setTargetType(e.target.value.toUpperCase())}/></Field><Notice error={query.error?.message}/><Table rows={query.data?.data??[]} columns={['createdAt','admin','action','targetType','targetId','reason','beforeValue','afterValue']}/></PageFrame>;
}

function AnalyticsPage() {
  const {token}=useAuthContext(); const [type,setType]=useState('users'); const [from,setFrom]=useState(''); const [to,setTo]=useState('');
  const suffix=new URLSearchParams({type,...(from&&{from}),...(to&&{to})}).toString(); const query=useQuery({queryKey:['ops','analytics',suffix],queryFn:()=>apiClient.get<RecordValue>(`/admin/analytics?${suffix}`,token!),enabled:!!token});
  return <PageFrame mode="analytics"><div className="flex flex-wrap gap-3"><Field label="View"><select className={inputClass} value={type} onChange={(e)=>setType(e.target.value)}>{['users','sessions','economy','matching'].map(v=><option key={v}>{humanize(v)}</option>)}</select></Field><Field label="From"><input className={inputClass} type="date" value={from} onChange={(e)=>setFrom(e.target.value)}/></Field><Field label="To"><input className={inputClass} type="date" value={to} onChange={(e)=>setTo(e.target.value)}/></Field></div><Notice error={query.error?.message}/>{query.data&&<Table rows={[query.data]} columns={Object.keys(query.data)}/>}</PageFrame>;
}

function AdsPage() {
  const {token}=useAuthContext(); const qc=useQueryClient(); const [status,setStatus]=useState(''); const [success,setSuccess]=useState('');
  const [form,setForm]=useState({advertiserName:'',title:'',body:'',targetUrl:'',topicCategories:'',placement:'ALL'});
  const query=useQuery({queryKey:['ops','ads',status],queryFn:()=>fetchPaginated<RecordValue>('/admin/ads',{limit:100,...(status&&{status})},token!),enabled:!!token});
  const create=useMutation({mutationFn:()=>apiClient.post('/admin/ads',{...form,topicCategories:form.topicCategories.split(',').map(v=>v.trim()).filter(Boolean)},token!),onSuccess:async()=>{setSuccess('Recommendation created.');setForm({...form,advertiserName:'',title:'',body:'',targetUrl:'',topicCategories:''});await qc.invalidateQueries({queryKey:['ops','ads']});}});
  const change=useMutation({mutationFn:({id,next}:{id:string;next:string})=>apiClient.patch(`/admin/ads/${id}`,{status:next},token!),onSuccess:async()=>{setSuccess('Recommendation status updated.');await qc.invalidateQueries({queryKey:['ops','ads']});}});
  const submit=(e:FormEvent)=>{e.preventDefault();create.mutate();};
  return <PageFrame mode="ads"><Field label="Status"><select className={inputClass} value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All</option>{['ACTIVE','PAUSED','ARCHIVED'].map(v=><option key={v}>{v}</option>)}</select></Field><Notice error={query.error?.message??create.error?.message??change.error?.message} success={success}/><Table rows={(query.data?.data??[]).map(row=>({...row,actions:<div className="flex gap-2">{row.status!=='PAUSED'&&<Button variant="outline" onClick={()=>change.mutate({id:String(row.id),next:'PAUSED'})}>Pause</Button>}{row.status!=='ACTIVE'&&<Button variant="outline" onClick={()=>change.mutate({id:String(row.id),next:'ACTIVE'})}>Activate</Button>}{row.status!=='ARCHIVED'&&<Button variant="outline" onClick={()=>change.mutate({id:String(row.id),next:'ARCHIVED'})}>Archive</Button>}</div>}))} columns={['advertiserName','title','placement','topicCategories','status','startDate','endDate','actions']}/><form onSubmit={submit} className="grid gap-4 rounded-lg border p-5"><h2 className="text-lg font-semibold">Create recommendation</h2>{(['advertiserName','title','body','targetUrl','topicCategories'] as const).map(key=><Field key={key} label={key==='topicCategories'?'Topic categories (comma separated)':humanize(key)}><input required className={inputClass} type={key==='targetUrl'?'url':'text'} value={form[key]} onChange={(e)=>setForm({...form,[key]:e.target.value})}/></Field>)}<Field label="Placement"><select className={inputClass} value={form.placement} onChange={(e)=>setForm({...form,placement:e.target.value})}>{['EMAIL','TOPIC_PAGE','DASHBOARD','ALL'].map(v=><option key={v}>{v}</option>)}</select></Field><Button disabled={create.isPending}>Create recommendation</Button></form></PageFrame>;
}

export function OperationalAdminPage({mode}:{mode:Mode}) {
  if(mode==='sessions') return <SessionsPage/>;
  if(mode==='points'||mode==='config') return <ConfigEditor mode={mode}/>;
  if(mode==='moderation') return <ModerationPage/>;
  if(mode==='audit') return <AuditPage/>;
  if(mode==='analytics') return <AnalyticsPage/>;
  return <AdsPage/>;
}
