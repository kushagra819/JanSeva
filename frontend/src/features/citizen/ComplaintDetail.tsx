import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { format } from 'date-fns';
import { AlertTriangle, Building2, CheckCircle, Clock3, MapPin, RefreshCw, Route, ShieldCheck } from 'lucide-react';
import { getGrievanceById, getGrievanceTimeline } from '../../api/grievances';
import type { Grievance, TimelineEvent } from '../../types';
import { Button } from '../../components/ui/button';
import { cn } from '../../utils/utils';

const readable = (value?: string) => value?.replaceAll('_', ' ') || 'Awaiting assignment';

const statusStyle = (status: string) => {
  if (status === 'RESOLVED') return 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300';
  if (status === 'REJECTED') return 'border-red-400/25 bg-red-500/10 text-red-300';
  if (status === 'IN_PROGRESS') return 'border-amber-400/25 bg-amber-500/10 text-amber-200';
  return 'border-blue-400/25 bg-blue-500/10 text-blue-300';
};

const urgency = (priority: string) => priority === 'EMERGENCY'
  ? { label: 'Immediate action', style: 'border-red-400/30 bg-red-500/12 text-red-300', detail: 'A safety-risk signal was detected and the department is expected to acknowledge it immediately.' }
  : priority === 'HIGH'
    ? { label: 'Urgent', style: 'border-orange-400/30 bg-orange-500/12 text-orange-200', detail: 'A major service disruption or escalating condition was detected and this report is prioritized.' }
    : { label: 'Routine', style: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300', detail: 'The issue is in the normal departmental work queue.' };

export function ComplaintDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [issue, events] = await Promise.all([
        getGrievanceById(id),
        getGrievanceTimeline(id).catch(() => []),
      ]);
      setGrievance(issue);
      setTimeline(events.sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()));
    } catch (reason: any) {
      setError(reason?.data?.message || 'Failed to load complaint details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void fetchData(); }, [id]);

  if (isLoading) return <div className="flex flex-col items-center justify-center py-20"><RefreshCw className="mb-4 h-8 w-8 animate-spin text-[var(--accent)]" /><p className="text-[var(--muted)]">Loading complaint…</p></div>;
  if (error || !grievance) return <div className="mx-auto flex max-w-md flex-col items-center justify-center py-20 text-center"><span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-300"><AlertTriangle className="h-8 w-8" /></span><h2 className="text-xl font-semibold">Complaint unavailable</h2><p className="mt-2 text-sm text-[var(--muted)]">{error || 'Complaint not found.'}</p><Button onClick={() => void fetchData()} variant="secondary" className="mt-6">Retry</Button></div>;

  const priority = urgency(grievance.priority);
  return <div className="mx-auto max-w-5xl space-y-6">
    {searchParams.get('new') === 'true' && <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" /><div><h2 className="font-semibold text-emerald-200">Complaint submitted</h2><p className="mt-1 text-sm text-emerald-100/70">Save tracking code <b>{grievance.trackingCode}</b>. Updates will appear here and in Notifications.</p></div></div>}

    <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-[var(--muted)]">Tracking code</p><h1 className="mt-2 break-all font-mono text-2xl font-bold sm:text-3xl">{grievance.trackingCode}</h1><p className="mt-2 text-sm text-[var(--muted)]">Submitted {format(new Date(grievance.createdAt), 'MMMM d, yyyy · h:mm a')}</p></div><span className={cn('w-fit rounded-full border px-3 py-1.5 text-xs font-semibold', statusStyle(grievance.status))}>{readable(grievance.status)}</span></div>
    </header>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <main className="space-y-6">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 sm:p-6"><h2 className="text-lg font-semibold">Issue details</h2><p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-white/90">{grievance.description || 'Complaint details are unavailable.'}</p><div className="mt-6 grid gap-4 border-t border-[var(--border)] pt-5 sm:grid-cols-2"><div className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" /><div><p className="text-xs uppercase tracking-wider text-[var(--muted)]">Location</p><p className="mt-1 text-sm">{[grievance.locality, grievance.district].filter(Boolean).join(', ') || 'Pinned location'}</p></div></div><div className="flex gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" /><div><p className="text-xs uppercase tracking-wider text-[var(--muted)]">Last known status</p><p className="mt-1 text-sm">{readable(grievance.status)}</p></div></div></div></section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 sm:p-6"><div className="flex items-center gap-2"><Route className="h-5 w-5 text-violet-300" /><h2 className="text-lg font-semibold">Where it is going</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-[var(--muted)]">Responsible department</p><p className="mt-2 flex items-center gap-2 font-semibold"><Building2 className="h-4 w-4 text-blue-300" />{readable(grievance.departmentCode)}</p></div><div className="rounded-xl bg-black/20 p-4"><p className="text-xs uppercase tracking-wider text-[var(--muted)]">Issue category</p><p className="mt-2 font-semibold">{readable(grievance.taxonomyCode?.split('.').pop())}</p></div></div><div className={cn('mt-4 rounded-xl border p-4', priority.style)}><p className="font-semibold">{priority.label}</p><p className="mt-1 text-xs leading-5 opacity-80">{priority.detail}</p></div>{grievance.status === 'PENDING_REVIEW' && <p className="mt-4 flex gap-2 rounded-xl bg-amber-500/8 p-3 text-xs text-amber-100/80"><ShieldCheck className="h-4 w-4 shrink-0" />A department officer will verify the routing before work begins.</p>}</section>
      </main>

      <aside className="h-fit rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-5 sm:p-6"><h2 className="text-lg font-semibold">Tracking timeline</h2>{timeline.length === 0 ? <p className="mt-5 text-sm text-[var(--muted)]">No updates recorded yet.</p> : <ol className="mt-6 space-y-0">{timeline.map((event, index) => <li key={event.id} className="flex gap-3"><div className="flex flex-col items-center"><span className={cn('mt-1 h-3 w-3 shrink-0 rounded-full border-2', index === timeline.length - 1 ? 'border-blue-300 bg-blue-400' : 'border-slate-500 bg-slate-700')} />{index < timeline.length - 1 && <span className="min-h-16 w-px flex-1 bg-[var(--border)]" />}</div><div className="min-w-0 pb-6"><div className="flex flex-wrap items-center gap-2"><span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', statusStyle(event.status))}>{readable(event.status)}</span><time className="text-[11px] text-[var(--muted)]">{format(new Date(event.createdAt), 'MMM d, h:mm a')}</time></div><p className="mt-2 break-words text-sm leading-5 text-white/85">{event.note || `Status updated to ${readable(event.status)}.`}</p></div></li>)}</ol>}</aside>
    </div>
  </div>;
}
