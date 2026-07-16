import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, BarChart3, Building2, ChevronDown, ChevronLeft, ChevronRight, Droplets, HeartPulse, LocateFixed, Map as MapIcon, Newspaper, Plus, RefreshCw, Search, Shield, ThumbsUp, Trees, Truck, Wrench, Zap } from 'lucide-react';
import { PublicIssueMap } from '../components/map/PublicIssueMap';
import { ReportFlow } from '../features/public/ReportFlow';
import { getPublicMapIssues } from '../api/public';
import type { DepartmentCode, MapIssue } from '../types';
import { civicDepartments, departmentName, departmentShortName } from '../data/civicCatalog';
import janSevaLogo from '../assets/jandhwani-logo.jpeg';

type Tab = 'map' | 'lookup' | 'report' | 'feed' | 'dashboard';
type Location = { latitude: number; longitude: number };
type PublicStatus = 'OPEN' | 'IN PROGRESS' | 'RESOLVED';

const resolvedStatuses = new Set(['RESOLVED', 'REJECTED']);
const inProgressStatuses = new Set(['PROCESSING', 'PENDING_REVIEW', 'ROUTED', 'IN_PROGRESS']);
const pieColors = ['#ffb020', '#2a7fff', '#32c887'];
const selectClass = 'h-10 rounded-xl border border-white/10 bg-[#101722] px-3 text-xs text-slate-200 outline-none focus:border-blue-400/50';

const departmentIcons: Record<DepartmentCode, typeof Wrench> = {
  ROADS: Wrench, WATER: Droplets, ELECTRICITY: Zap, SANITATION: Truck, PUBLIC_SAFETY: Shield,
  PARKS_HORTICULTURE: Trees, HEALTH: HeartPulse, BUILDING_URBAN_PLANNING: Building2,
  TRANSPORT: Truck, PUBLIC_SERVICES: AlertTriangle
};

const distanceKm = (first: Location, issue: MapIssue) => {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(issue.publicLatitude - first.latitude);
  const dLon = radians(issue.publicLongitude - first.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(issue.publicLatitude)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const timeAgo = (value: string) => {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
};

const publicStatus = (status: string): PublicStatus => resolvedStatuses.has(status) ? 'RESOLVED' : inProgressStatuses.has(status) ? 'IN PROGRESS' : 'OPEN';
const statusClasses = (status: PublicStatus) => status === 'RESOLVED' ? 'bg-emerald-500/12 text-emerald-300' : status === 'IN PROGRESS' ? 'bg-blue-500/12 text-blue-300' : 'bg-amber-500/12 text-amber-300';
const issueTitle = (issue: MapIssue) => issue.taxonomyCode?.split('.').pop()?.replaceAll('_', ' ') || departmentShortName(issue.departmentCode);

function AppHeader({ issueCount }: { issueCount: number }) {
  const accessLinks = [
    { label: 'Citizen', to: '/login?portal=citizen' },
    { label: 'Department', to: '/login?portal=department' },
    { label: 'Admin', to: '/login?portal=admin' }
  ];
  return <header className="sticky top-0 z-[1100] border-b border-white/8 bg-[#080b12]/95 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4"><Link to="/" aria-label="JanDhwani home" className="flex items-center gap-3"><img src={janSevaLogo} alt="JanDhwani" className="h-8 w-auto object-contain" /><span className="hidden border-l border-white/10 pl-3 text-xs text-slate-500 md:block">Live civic action</span></Link><div className="flex items-center gap-3"><span className="flex items-center gap-1.5 text-[11px] text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />{issueCount} live</span><nav className="hidden items-center gap-1 sm:flex" aria-label="Account portals">{accessLinks.map(link => <Link key={link.label} to={link.to} className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/5">{link.label}</Link>)}</nav><details className="relative sm:hidden"><summary className="cursor-pointer list-none rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-200">Sign in</summary><div className="absolute right-0 mt-2 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#101722] p-1 shadow-2xl">{accessLinks.map(link => <Link key={link.label} to={link.to} className="block rounded-lg px-3 py-2 text-xs text-slate-200 hover:bg-white/10">{link.label} login</Link>)}</div></details></div></div></header>;
}

function BottomTabs({ tab, setTab }: { tab: Tab; setTab: (tab: Tab) => void }) {
  const items = [
    { id: 'map' as const, label: 'Map', icon: MapIcon }, { id: 'lookup' as const, label: 'Lookup', icon: Search },
    { id: 'report' as const, label: 'Report', icon: Plus, raised: true }, { id: 'feed' as const, label: 'Feed', icon: Newspaper },
    { id: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 }
  ];
  return <nav className="fixed inset-x-0 bottom-0 z-[1200] border-t border-white/10 bg-[#090c14]/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl" aria-label="Civic app navigation"><div className="mx-auto grid h-[76px] max-w-2xl grid-cols-5 items-end px-2 pb-2">{items.map(item => <button type="button" key={item.id} onClick={() => setTab(item.id)} className={`relative flex h-14 flex-col items-center justify-end gap-1 text-[10px] font-medium transition ${tab === item.id ? 'text-white' : 'text-slate-500'}`}>{item.raised ? <span className={`absolute -top-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-[#090c14] shadow-xl ${tab === item.id ? 'bg-[#ff4450]' : 'bg-[#ff643b]'}`}><item.icon className="h-7 w-7 text-white" /></span> : <item.icon className="h-5 w-5" />}<span>{item.label}</span></button>)}</div></nav>;
}

function LookupTab({ issues }: { issues: MapIssue[] }) {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<DepartmentCode>();
  const normalized = query.trim().toLowerCase();
  const filtered = civicDepartments.filter(department => !normalized || `${department.name} ${department.areas} ${department.complaintTypes.join(' ')}`.toLowerCase().includes(normalized));

  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6"><h1 className="text-2xl font-bold">Who handles my issue?</h1><p className="mt-1 text-sm text-slate-400">Search a problem to find the responsible department and its scope.</p><div className="relative mt-5"><Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Try pothole, pipe leak, streetlight..." className="h-12 w-full rounded-2xl border border-white/10 bg-white/[.045] pl-10 pr-3 text-sm outline-none focus:border-blue-400/40" /></div>
    <div className="mt-5 space-y-3">{filtered.map(department => {
      const reports = issues.filter(issue => issue.departmentCode === department.code);
      const open = reports.filter(issue => !resolvedStatuses.has(issue.status)).length;
      const Icon = departmentIcons[department.code];
      return <article key={department.code} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.035]"><button type="button" onClick={() => setExpanded(current => current === department.code ? undefined : department.code)} className="flex w-full items-center gap-3 p-4 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300"><Icon className="h-5 w-5" /></span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{department.name}</b><span className="mt-1 block truncate text-xs text-slate-500">{department.areas}</span></span><span className="text-right"><b className="block text-lg">{open}</b><small className="text-[10px] text-slate-500">open now</small></span><ChevronDown className={`h-4 w-4 text-slate-500 transition ${expanded === department.code ? 'rotate-180' : ''}`} /></button>{expanded === department.code && <div className="border-t border-white/8 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">This department handles</p><div className="mt-2 flex flex-wrap gap-1.5">{department.complaintTypes.map(type => <span key={type} className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">{type}</span>)}</div></div>}</article>;
    })}{filtered.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No matching service. Use Report and choose “Other”.</div>}</div>
  </div>;
}

function IssueDetail({ issue, seen, onBack, onSeen }: { issue: MapIssue; seen: number; onBack: () => void; onSeen: () => void }) {
  const status = publicStatus(issue.status);
  const stages = [
    { label: 'Submitted', done: true, detail: new Date(issue.createdAt).toLocaleString() },
    { label: 'Acknowledged', done: status !== 'OPEN', detail: status !== 'OPEN' ? 'Department notified' : 'Awaiting department' },
    { label: 'In progress', done: status === 'IN PROGRESS' || status === 'RESOLVED', detail: status === 'IN PROGRESS' || status === 'RESOLVED' ? 'Work assigned' : 'Pending' },
    { label: 'Resolved', done: status === 'RESOLVED', detail: status === 'RESOLVED' ? 'Resolution recorded' : 'Pending' }
  ];
  return <div className="mx-auto max-w-2xl px-4 py-6"><button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-slate-400"><ChevronLeft className="h-4 w-4" />Back to feed</button><div className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-sm text-blue-300">{issue.trackingCode}</p><h1 className="mt-2 text-2xl font-bold">{issueTitle(issue)}</h1><p className="mt-2 text-sm text-slate-400">{departmentName(issue.departmentCode)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(status)}`}>{status}</span></div><div className="mt-5 grid grid-cols-2 gap-3 text-xs"><div className="rounded-xl bg-black/20 p-3"><span className="text-slate-500">Urgency</span><b className="mt-1 block">{issue.priority === 'HIGH' ? 'URGENT' : issue.priority}</b></div><div className="rounded-xl bg-black/20 p-3"><span className="text-slate-500">Public area</span><b className="mt-1 block">{issue.publicLatitude.toFixed(2)}, {issue.publicLongitude.toFixed(2)}</b></div></div><button type="button" onClick={onSeen} className="mt-4 flex items-center gap-2 rounded-full bg-violet-500/12 px-4 py-2 text-xs font-semibold text-violet-200"><ThumbsUp className="h-4 w-4" />I have seen this too · {seen}</button></div><div className="mt-5 rounded-3xl border border-white/10 bg-white/[.035] p-5"><h2 className="font-semibold">Status timeline</h2><div className="mt-5">{stages.map((stage, index) => <div key={stage.label} className="flex gap-3"><div className="flex flex-col items-center"><span className={`h-3 w-3 rounded-full border-2 ${stage.done ? 'border-blue-400 bg-blue-400' : 'border-slate-600 bg-[#0b1019]'}`} />{index < stages.length - 1 && <span className={`h-14 w-px ${stage.done ? 'bg-blue-400/40' : 'bg-white/10'}`} />}</div><div className="-mt-1"><b className={stage.done ? 'text-white' : 'text-slate-500'}>{stage.label}</b><p className="mt-1 text-xs text-slate-500">{stage.detail}</p></div></div>)}</div></div></div>;
}

function FeedTab({ issues, location, requestLocation, seenCounts, onSeen, refresh, refreshing }: { issues: MapIssue[]; location?: Location; requestLocation: () => void; seenCounts: Record<string, number>; onSeen: (id: string) => void; refresh: () => void; refreshing: boolean }) {
  const [sort, setSort] = useState<'RECENT' | 'DISTANCE'>('RECENT');
  const [status, setStatus] = useState<PublicStatus | 'ALL'>('ALL');
  const [department, setDepartment] = useState<DepartmentCode | 'ALL'>('ALL');
  const [priority, setPriority] = useState<'ALL' | 'HIGH' | 'EMERGENCY'>('ALL');
  const [selected, setSelected] = useState<MapIssue>();
  const nearby = useMemo(() => location ? issues.filter(issue => distanceKm(location, issue) <= 1) : issues, [issues, location]);
  const visible = useMemo(() => nearby.filter(issue => (status === 'ALL' || publicStatus(issue.status) === status) && (department === 'ALL' || issue.departmentCode === department) && (priority === 'ALL' || issue.priority === priority)).sort((first, second) => sort === 'DISTANCE' && location ? distanceKm(location, first) - distanceKm(location, second) : new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()), [department, location, nearby, priority, sort, status]);
  const reset = () => { setStatus('ALL'); setDepartment('ALL'); setPriority('ALL'); setSort('RECENT'); };
  if (selected) return <IssueDetail issue={selected} seen={seenCounts[selected.id] || 0} onBack={() => setSelected(undefined)} onSeen={() => onSeen(selected.id)} />;

  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6"><div className="flex items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">Live issue feed</h1><p className="mt-1 text-sm text-slate-400">{visible.length} reports match your filters{location ? ' within 1 km' : ''}.</p></div><button type="button" onClick={refresh} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5"><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button></div>
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[.025] p-3"><select aria-label="Filter feed by status" value={status} onChange={event => setStatus(event.target.value as PublicStatus | 'ALL')} className={selectClass}><option value="ALL">All statuses</option><option value="OPEN">Open</option><option value="IN PROGRESS">In progress</option><option value="RESOLVED">Resolved</option></select><select aria-label="Filter feed by department" value={department} onChange={event => setDepartment(event.target.value as DepartmentCode | 'ALL')} className={selectClass}><option value="ALL">All departments</option>{civicDepartments.map(item => <option key={item.code} value={item.code}>{item.shortName}</option>)}</select><select aria-label="Filter feed by urgency" value={priority} onChange={event => setPriority(event.target.value as 'ALL' | 'HIGH' | 'EMERGENCY')} className={selectClass}><option value="ALL">All urgency</option><option value="HIGH">Urgent</option><option value="EMERGENCY">Emergency</option></select><select aria-label="Sort issue feed" value={sort} onChange={event => setSort(event.target.value as 'RECENT' | 'DISTANCE')} className={selectClass}><option value="RECENT">Most recent</option><option value="DISTANCE" disabled={!location}>Nearest first</option></select><button type="button" onClick={requestLocation} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-xs ${location ? 'border-emerald-400/30 text-emerald-300' : 'border-white/10 text-blue-300'}`}><LocateFixed className="h-4 w-4" />{location ? 'Near me on' : 'Near me'}</button><button type="button" onClick={reset} className="ml-auto px-2 text-xs text-slate-400 hover:text-white">Reset</button></div>
    <div className="mt-5 space-y-3">{visible.map(issue => { const Icon = departmentIcons[issue.departmentCode || 'PUBLIC_SERVICES']; const issueStatus = publicStatus(issue.status); return <button type="button" key={issue.id} onClick={() => setSelected(issue)} className="flex w-full gap-4 rounded-2xl border border-white/10 bg-white/[.035] p-4 text-left transition hover:bg-white/[.06]"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${issue.priority === 'EMERGENCY' ? 'bg-red-500/15 text-red-300' : 'bg-blue-500/10 text-blue-300'}`}><Icon className="h-6 w-6" /></span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><b className="truncate text-sm">{issueTitle(issue)}</b><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${statusClasses(issueStatus)}`}>{issueStatus}</span></span><span className="mt-1 block text-xs text-slate-500">{departmentShortName(issue.departmentCode)} · {issue.publicLatitude.toFixed(2)}, {issue.publicLongitude.toFixed(2)}</span><span className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500"><span>{timeAgo(issue.createdAt)}</span><span>{seenCounts[issue.id] || 0} seen this</span>{location && <span>{distanceKm(location, issue).toFixed(1)} km</span>}</span></span><ChevronRight className="mt-5 h-4 w-4 text-slate-600" /></button>; })}{visible.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-slate-500">No issues match these filters. <button type="button" onClick={reset} className="text-blue-300 hover:underline">Clear filters</button></div>}</div>
  </div>;
}

function DashboardTab({ issues }: { issues: MapIssue[] }) {
  const [department, setDepartment] = useState<DepartmentCode | 'ALL'>('ALL');
  const scoped = department === 'ALL' ? issues : issues.filter(issue => issue.departmentCode === department);
  const departmentStats = useMemo(() => civicDepartments.map(item => {
    const reports = issues.filter(issue => issue.departmentCode === item.code);
    const open = reports.filter(issue => !resolvedStatuses.has(issue.status)).length;
    const urgent = reports.filter(issue => ['HIGH', 'EMERGENCY'].includes(issue.priority) && !resolvedStatuses.has(issue.status)).length;
    const score = reports.length ? Math.max(1, Math.min(10, 10 - open / reports.length * 4 - urgent * .5)) : null;
    return { ...item, reports: reports.length, open, score: score == null ? null : Number(score.toFixed(1)) };
  }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1)), [issues]);
  const chartData = departmentStats.filter(item => item.reports > 0 && (department === 'ALL' || item.code === department)).map(item => ({ name: item.shortName, reports: item.reports }));
  const statusData = [
    { name: 'Open', value: scoped.filter(issue => publicStatus(issue.status) === 'OPEN').length },
    { name: 'In progress', value: scoped.filter(issue => publicStatus(issue.status) === 'IN PROGRESS').length },
    { name: 'Resolved', value: scoped.filter(issue => publicStatus(issue.status) === 'RESOLVED').length }
  ].filter(item => item.value > 0);
  const urgent = scoped.filter(issue => ['HIGH', 'EMERGENCY'].includes(issue.priority) && !resolvedStatuses.has(issue.status)).length;
  const resolved = scoped.filter(issue => resolvedStatuses.has(issue.status)).length;
  const scoreColor = (score: number | null) => score == null ? '#64748b' : score >= 7 ? '#32c887' : score >= 5 ? '#eabf32' : '#ef8a36';

  return <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6"><div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-bold">Civic performance dashboard</h1><p className="mt-1 text-sm text-slate-400">A compact view of live workload, urgency and resolution.</p></div><select aria-label="Dashboard department" value={department} onChange={event => setDepartment(event.target.value as DepartmentCode | 'ALL')} className={selectClass}><option value="ALL">All departments</option>{civicDepartments.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></div>
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">{[['Total reports', scoped.length], ['Open now', scoped.length - resolved], ['Urgent open', urgent], ['Resolved', resolved]].map(([title, value]) => <div key={title} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-xs text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]"><div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="text-sm font-semibold">Reports by department</h2><div className="mt-4 h-64">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} /><Bar dataKey="reports" fill="#5b8cff" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-xs text-slate-500">No report data yet.</p>}</div></div><div className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="text-sm font-semibold">Status mix</h2><div className="mt-4 h-52">{statusData.length ? <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={76} paddingAngle={3}>{statusData.map((_, index) => <Cell key={index} fill={pieColors[index]} />)}</Pie><Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12 }} /></PieChart></ResponsiveContainer> : <p className="flex h-full items-center justify-center text-xs text-slate-500">No status data yet.</p>}</div><div className="flex justify-center gap-3 text-[10px] text-slate-400">{statusData.map((item, index) => <span key={item.name} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: pieColors[index] }} />{item.name} {item.value}</span>)}</div></div></div>
    {department === 'ALL' && <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.035] p-4"><h2 className="text-sm font-semibold">Department accountability</h2><p className="mt-1 text-xs text-slate-500">Score reflects unresolved share and urgent workload; it is hidden when no reports exist.</p><div className="mt-4 grid gap-2 md:grid-cols-2">{departmentStats.map((item, index) => <div key={item.code} className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-3"><span className="w-6 text-xs text-slate-500">#{index + 1}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.shortName}</b><small className="text-slate-500">{item.reports} reports · {item.open} open</small></span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: scoreColor(item.score) }} /><b>{item.score ?? '—'}</b></span></div>)}</div></div>}
  </div>;
}

export function CivicApp() {
  const [tab, setTab] = useState<Tab>('map');
  const [issues, setIssues] = useState<MapIssue[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<Location>();
  const [seenCounts, setSeenCounts] = useState<Record<string, number>>({});
  const refresh = useCallback(async () => { setRefreshing(true); try { setIssues(await getPublicMapIssues()); } finally { setRefreshing(false); } }, []);
  useEffect(() => { void refresh(); const timer = window.setInterval(() => void refresh(), 20_000); return () => window.clearInterval(timer); }, [refresh]);
  const requestLocation = () => navigator.geolocation?.getCurrentPosition(position => setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }), () => undefined, { enableHighAccuracy: true, timeout: 10_000 });
  const markSeen = (id: string) => setSeenCounts(current => ({ ...current, [id]: (current[id] || 0) + 1 }));
  return <div className="min-h-screen bg-[#080b12] pb-20 text-white"><AppHeader issueCount={issues.length} /><main>{tab === 'map' && <PublicIssueMap appMode issues={issues} />}{tab === 'lookup' && <LookupTab issues={issues} />}{tab === 'report' && <ReportFlow issues={issues} onSubmitted={refresh} onSeen={markSeen} />}{tab === 'feed' && <FeedTab issues={issues} location={location} requestLocation={requestLocation} seenCounts={seenCounts} onSeen={markSeen} refresh={refresh} refreshing={refreshing} />}{tab === 'dashboard' && <DashboardTab issues={issues} />}</main><BottomTabs tab={tab} setTab={setTab} /></div>;
}
