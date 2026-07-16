import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight, Clock, FileText, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import { getMyGrievances } from '../../api/grievances';
import type { Grievance } from '../../types';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils/utils';

type SortOrder = 'NEWEST' | 'OLDEST' | 'UPDATED';
const PAGE_SIZE = 8;
const resolvedStatuses = new Set(['RESOLVED', 'REJECTED']);
const activeStatuses = new Set(['ROUTED', 'IN_PROGRESS', 'PROCESSING']);
const fieldClass = 'h-11 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white outline-none focus:border-[var(--accent)]';
const label = (value?: string) => value?.replaceAll('_', ' ') || 'Awaiting routing';
const category = (value?: string) => label(value?.split('.').pop());

const statusColor = (status: string) => {
  if (status === 'RESOLVED') return 'border-green-500/20 bg-green-500/10 text-green-400';
  if (status === 'REJECTED') return 'border-red-500/20 bg-red-500/10 text-red-400';
  if (status === 'IN_PROGRESS') return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
  if (status === 'ROUTED') return 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300';
  return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
};

export function MyComplaints() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sort, setSort] = useState<SortOrder>('NEWEST');
  const [page, setPage] = useState(1);

  const fetchGrievances = async () => {
    setLoading(true);
    setError(null);
    try { setGrievances(await getMyGrievances()); }
    catch (reason: any) { setError(reason?.data?.message || 'Failed to load complaints. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchGrievances(); }, []);

  const departments = useMemo(() => [...new Set(grievances.map(item => item.departmentCode).filter(Boolean))].sort(), [grievances]);
  const categories = useMemo(() => [...new Set(grievances.map(item => item.taxonomyCode).filter(Boolean))].sort(), [grievances]);
  const statuses = useMemo(() => [...new Set(grievances.map(item => item.status))].sort(), [grievances]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const to = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
    return grievances.filter(item => {
      const created = new Date(item.createdAt).getTime();
      const haystack = `${item.trackingCode} ${item.description || ''} ${item.departmentCode || ''} ${item.taxonomyCode || ''}`.toLowerCase();
      return (!query || haystack.includes(query))
        && (department === 'ALL' || item.departmentCode === department)
        && (selectedCategory === 'ALL' || item.taxonomyCode === selectedCategory)
        && (status === 'ALL' || item.status === status)
        && (priority === 'ALL' || item.priority === priority)
        && created >= from && created <= to;
    }).sort((first, second) => {
      const firstTime = new Date(sort === 'UPDATED' ? first.updatedAt : first.createdAt).getTime();
      const secondTime = new Date(sort === 'UPDATED' ? second.updatedAt : second.createdAt).getTime();
      return sort === 'OLDEST' ? firstTime - secondTime : secondTime - firstTime;
    });
  }, [department, fromDate, grievances, priority, search, selectedCategory, sort, status, toDate]);

  useEffect(() => { setPage(1); }, [department, fromDate, priority, search, selectedCategory, sort, status, toDate]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const resetFilters = () => { setSearch(''); setDepartment('ALL'); setSelectedCategory('ALL'); setStatus('ALL'); setPriority('ALL'); setFromDate(''); setToDate(''); setSort('NEWEST'); };
  const stats = {
    total: grievances.length,
    active: grievances.filter(item => activeStatuses.has(item.status)).length,
    pending: grievances.filter(item => !activeStatuses.has(item.status) && !resolvedStatuses.has(item.status)).length,
    resolved: grievances.filter(item => resolvedStatuses.has(item.status)).length
  };

  if (loading) return <div className="flex flex-col items-center justify-center py-20"><RefreshCw className="mb-4 h-8 w-8 animate-spin text-[var(--accent)]" /><p className="text-[var(--muted)]">Loading your complaints...</p></div>;
  if (error) return <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)]/10 text-[var(--danger)]"><AlertTriangle className="h-8 w-8" /></div><h3 className="mb-2 text-xl font-medium text-white">Failed to load</h3><p className="mb-6 text-[var(--muted)]">{error}</p><Button onClick={() => void fetchGrievances()} variant="secondary"><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>;

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold text-white">My grievances</h1><p className="mt-1 text-[var(--muted)]">Search and track every issue independently.</p></div><Button href="/citizen/submit" size="sm">Raise new issue</Button></div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ['Total', stats.total, 'text-white'], ['Active', stats.active, 'text-amber-300'], ['Pending routing', stats.pending, 'text-blue-300'], ['Closed', stats.resolved, 'text-emerald-300']
    ].map(([title, value, color]) => <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4"><p className="text-xs text-[var(--muted)]">{title}</p><p className={cn('mt-2 text-2xl font-bold', color)}>{value}</p></div>)}</div>

    {grievances.length === 0 ? <div className="flex flex-col items-center rounded-3xl border border-dashed border-[var(--border)] py-20 text-center"><FileText className="mb-4 h-10 w-10 text-[var(--muted)]" /><h2 className="text-lg font-semibold text-white">No grievances yet</h2><p className="mt-2 max-w-md text-sm text-[var(--muted)]">Raise an issue and it will appear here with its own tracking number and timeline.</p><Button href="/citizen/submit" className="mt-6">Raise an issue</Button></div> : <>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-4" aria-label="Grievance filters">
        <div className="mb-3 flex items-center justify-between"><p className="flex items-center gap-2 text-sm font-semibold text-white"><SlidersHorizontal className="h-4 w-4" />Filter grievances</p><button type="button" onClick={resetFilters} className="text-xs text-[var(--accent-strong)] hover:underline">Reset all</button></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative md:col-span-2"><Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--muted)]" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tracking ID, issue, category..." className={`${fieldClass} w-full pl-10`} /></div>
          <select value={department} onChange={event => setDepartment(event.target.value)} className={fieldClass}><option value="ALL">All departments</option>{departments.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={selectedCategory} onChange={event => setSelectedCategory(event.target.value)} className={fieldClass}><option value="ALL">All categories</option>{categories.map(item => <option key={item} value={item}>{category(item)}</option>)}</select>
          <select value={status} onChange={event => setStatus(event.target.value)} className={fieldClass}><option value="ALL">All statuses</option>{statuses.map(item => <option key={item} value={item}>{label(item)}</option>)}</select>
          <select value={priority} onChange={event => setPriority(event.target.value)} className={fieldClass}><option value="ALL">All priorities</option><option value="NORMAL">Routine</option><option value="HIGH">Urgent</option><option value="EMERGENCY">Emergency</option></select>
          <input type="date" aria-label="Submitted from" value={fromDate} onChange={event => setFromDate(event.target.value)} className={fieldClass} />
          <input type="date" aria-label="Submitted to" value={toDate} onChange={event => setToDate(event.target.value)} className={fieldClass} />
          <select value={sort} onChange={event => setSort(event.target.value as SortOrder)} className={fieldClass}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="UPDATED">Recently updated</option></select>
        </div>
      </section>

      <div className="flex items-center justify-between text-sm text-[var(--muted)]"><span>{filtered.length} of {grievances.length} grievances</span>{filtered.length > PAGE_SIZE && <span>Page {page} of {totalPages}</span>}</div>
      <div className="grid gap-4">{visible.map(item => <Link key={item.id} to={`/citizen/complaints/${item.id}`} className="block rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 transition hover:border-white/20 hover:bg-[var(--surface-soft)]">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 font-mono text-xs text-white">{item.trackingCode}</span><span className={cn('rounded-full border px-2.5 py-1 text-xs', statusColor(item.status))}>{label(item.status)}</span>{item.priority !== 'NORMAL' && <span className={cn('flex items-center gap-1 text-xs', item.priority === 'EMERGENCY' ? 'font-bold text-red-400' : 'text-orange-300')}><AlertCircle className="h-3 w-3" />{item.priority === 'HIGH' ? 'URGENT' : 'EMERGENCY'}</span>}</div><p className="mt-3 line-clamp-2 font-medium text-white">{item.description || category(item.taxonomyCode)}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--muted)]"><span>{label(item.departmentCode)}</span><span>{category(item.taxonomyCode)}</span><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Submitted {new Date(item.createdAt).toLocaleString()}</span><span>Updated {new Date(item.updatedAt).toLocaleString()}</span></div></div><span className="flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--accent-strong)]">Track <ChevronRight className="h-4 w-4" /></span></div>
      </Link>)}</div>
      {filtered.length === 0 && <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-sm text-[var(--muted)]">No grievance matches these filters. <button type="button" onClick={resetFilters} className="text-[var(--accent-strong)] hover:underline">Clear filters</button></div>}
      {totalPages > 1 && <div className="flex items-center justify-center gap-3"><Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(current => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" />Previous</Button><span className="text-sm text-[var(--muted)]">{page} / {totalPages}</span><Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => setPage(current => Math.min(totalPages, current + 1))}>Next<ChevronRight className="h-4 w-4" /></Button></div>}
    </>}
  </div>;
}
