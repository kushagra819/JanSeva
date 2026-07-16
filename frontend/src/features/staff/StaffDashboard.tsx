import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BarChart3, Building2, ClipboardCheck, LogOut, MapPinned, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { PublicIssueMap } from '../../components/map/PublicIssueMap';
import { getGrievanceById } from '../../api/grievances';
import { Button } from '../../components/ui/button';
import type { AnalyticsSummary, DepartmentCode, Grievance, GrievanceStatus, MapIssue, User } from '../../types';
import janSevaLogo from '../../assets/jandhwani-logo.jpeg';
import {
  assignGrievance,
  createStaffUser,
  departmentOptions,
  getAdminUsers,
  getAnalyticsSummary,
  getAssignableOfficers,
  getAuditEvents,
  getStaffGrievances,
  getStaffMapIssues,
  nextStatuses,
  priorityOptions,
  reviewGrievance,
  statusOptions,
  updateGrievanceStatus,
  type AuditEvent,
  type CreateStaffPayload,
  type QueueFilters
} from '../../api/staff';

type Section = 'queue' | 'map' | 'analytics' | 'admin';

const fieldClass = 'h-10 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-white outline-none focus:border-[var(--accent)]';
const panelClass = 'rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)]';

const priorityColor: Record<string, string> = {
  EMERGENCY: '#ff5f6d',
  HIGH: '#ff9b47',
  NORMAL: '#2a7fff'
};

const formatLabel = (value?: string) => value?.replaceAll('_', ' ') || 'Unassigned';

const getSlaDeadline = (grievance: Grievance) => {
  if (grievance.slaDueAt) return new Date(grievance.slaDueAt).getTime();
  const minutes = grievance.priority === 'EMERGENCY' ? 15 : grievance.priority === 'HIGH' ? 120 : 1440;
  return new Date(grievance.createdAt).getTime() + minutes * 60_000;
};

const awaitingAcknowledgement = (grievance: Grievance) => ['RECEIVED', 'PENDING_REVIEW', 'ROUTED'].includes(grievance.status);

const escalationText = (grievance: Grievance, now: number) => {
  if (!['EMERGENCY', 'HIGH'].includes(grievance.priority) || !awaitingAcknowledgement(grievance)) return '';
  const remaining = getSlaDeadline(grievance) - now;
  if (remaining <= 0) return 'AUTO-ESCALATED';
  const minutes = Math.ceil(remaining / 60_000);
  return `Escalates in ${minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`}`;
};

export function StaffDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [section, setSection] = useState<Section>('queue');
  const [filters, setFilters] = useState<QueueFilters>({});
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [selected, setSelected] = useState<Grievance | null>(null);
  const [mapIssues, setMapIssues] = useState<MapIssue[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [officers, setOfficers] = useState<User[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [reviewDepartment, setReviewDepartment] = useState<DepartmentCode>('PUBLIC_SERVICES');
  const [reviewReason, setReviewReason] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [nextStatus, setNextStatus] = useState<GrievanceStatus | ''>('');
  const [assignee, setAssignee] = useState('');
  const [staffForm, setStaffForm] = useState<CreateStaffPayload>({
    name: '', email: '', password: '', role: 'OFFICER', departmentCode: 'PUBLIC_SERVICES'
  });
  const [now, setNow] = useState(Date.now());

  const canSeeAnalytics = user?.role !== 'OFFICER';
  const canAssign = ['DEPARTMENT_HEAD', 'ADMIN', 'COMMISSIONER'].includes(user?.role || '');
  const isAdmin = user?.role === 'ADMIN';
  const portalTitle = isAdmin
    ? 'JanDhwani Admin'
    : user?.departmentCode
      ? `${formatLabel(user.departmentCode)} Department`
      : 'City Operations';

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    const requests: Promise<unknown>[] = [
      getStaffGrievances(filters).then(setGrievances),
      getStaffMapIssues().then(setMapIssues),
      getAssignableOfficers().then(setOfficers)
    ];
    if (canSeeAnalytics) requests.push(getAnalyticsSummary().then(setAnalytics));
    if (isAdmin) {
      requests.push(getAdminUsers().then(setAdminUsers));
      requests.push(getAuditEvents().then(setAuditEvents));
    }
    const results = await Promise.allSettled(requests);
    if (results.some(result => result.status === 'rejected')) {
      setError('Some operational data could not be loaded. Refresh to try again.');
    }
    setLoading(false);
  }, [canSeeAnalytics, filters, isAdmin]);

  useEffect(() => { void loadData(); }, [loadData]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const refreshed = grievances.find(item => item.id === selected.id);
    if (refreshed) setSelected(refreshed);
  }, [grievances]);

  const runAction = async (action: () => Promise<Grievance>, message: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await action();
      setSelected(updated);
      setNotice(message);
      await loadData();
    } catch (err: any) {
      setError(err?.data?.message || 'The operation could not be completed.');
    } finally {
      setSaving(false);
    }
  };

  const orderedGrievances = useMemo(() => [...grievances].sort((a, b) => {
    const priorityRank = { EMERGENCY: 0, HIGH: 1, NORMAL: 2 };
    const rank = priorityRank[a.priority] - priorityRank[b.priority];
    return rank || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  }), [grievances]);
  const escalatedCount = grievances.filter(item => escalationText(item, now) === 'AUTO-ESCALATED').length;
  const distressCount = grievances.filter(item => item.sentiment === 'FRUSTRATED' || item.sentiment === 'DISTRESSED' || item.sentiment === 'CONCERNED').length;

  const navItems = [
    { id: 'queue' as const, label: 'Operations queue', icon: ClipboardCheck, show: true },
    { id: 'map' as const, label: 'Issue map', icon: MapPinned, show: true },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3, show: canSeeAnalytics },
    { id: 'admin' as const, label: 'Administration', icon: Users, show: isAdmin }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createStaffUser({
        ...staffForm,
        departmentCode: ['OFFICER', 'DEPARTMENT_HEAD'].includes(staffForm.role)
          ? staffForm.departmentCode
          : undefined
      });
      setNotice('Staff account created successfully.');
      setStaffForm({ name: '', email: '', password: '', role: 'OFFICER', departmentCode: 'PUBLIC_SERVICES' });
      await loadData();
    } catch (err: any) {
      setError(err?.data?.message || 'Staff account could not be created.');
    } finally {
      setSaving(false);
    }
  };

  const openMapIssue = async (issue: MapIssue) => {
    setError('');
    try {
      const grievance = grievances.find(item => item.id === issue.id) || await getGrievanceById(issue.id);
      setSelected(grievance);
      setNextStatus('');
      setSection('queue');
    } catch (reason: any) {
      setError(reason?.data?.message || 'This issue could not be opened for your role.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-white">
      <header className="sticky top-0 z-[1001] border-b border-[var(--border)] bg-[rgba(7,17,31,.94)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Link to="/" aria-label="JanDhwani home" className="shrink-0"><img src={janSevaLogo} alt="JanDhwani" className="h-8 w-auto object-contain sm:h-9" /></Link>
            <div>
              <p className="font-semibold">{portalTitle}</p>
              <p className="text-xs text-[var(--muted)]">{formatLabel(user?.role)}{user?.departmentCode ? ` · ${formatLabel(user.departmentCode)}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => void loadData()} aria-label="Refresh dashboard">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4" />Sign out</Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-5 lg:grid-cols-[230px_1fr] lg:px-8">
        <nav className={`${panelClass} flex gap-2 overflow-x-auto p-2 lg:sticky lg:top-24 lg:h-fit lg:flex-col`} aria-label="Staff sections">
          {navItems.filter(item => item.show).map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} className={`flex min-w-max items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${section === item.id ? 'bg-white/10 text-white' : 'text-[var(--muted)] hover:bg-white/5'}`}>
              <item.icon className="h-4 w-4" />{item.label}
            </button>
          ))}
        </nav>

        <main className="min-w-0 space-y-4">
          {(notice || error) && <div aria-live="polite" className={`rounded-xl border p-3 text-sm ${error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{error || notice}</div>}

          {section === 'queue' && (
            <div className="space-y-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div><h1 className="text-2xl font-bold">Operational grievance queue</h1><p className="text-sm text-[var(--muted)]">Emergency and high-priority cases appear first.</p></div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-red-300">{escalatedCount} auto-escalated</span>
                  <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-amber-200">{distressCount} distress signals</span>
                </div>
              </div>
              <div className={`${panelClass} grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5`}>
                <input aria-label="Search grievances" className={fieldClass} placeholder="Tracking code or text" value={filters.query || ''} onChange={event => setFilters(current => ({ ...current, query: event.target.value }))} />
                <select aria-label="Filter by status" className={fieldClass} value={filters.status || ''} onChange={event => setFilters(current => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{statusOptions.map(value => <option key={value}>{value}</option>)}</select>
                <select aria-label="Filter by priority" className={fieldClass} value={filters.priority || ''} onChange={event => setFilters(current => ({ ...current, priority: event.target.value }))}><option value="">All priorities</option>{priorityOptions.map(value => <option key={value}>{value}</option>)}</select>
                {['ADMIN', 'COMMISSIONER'].includes(user?.role || '') && <select aria-label="Filter by department" className={fieldClass} value={filters.departmentCode || ''} onChange={event => setFilters(current => ({ ...current, departmentCode: event.target.value }))}><option value="">All departments</option>{departmentOptions.map(value => <option key={value}>{value}</option>)}</select>}
                <Button size="sm" onClick={() => void loadData()}>Apply filters</Button>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
                <div className={`${panelClass} divide-y divide-[var(--border)] overflow-hidden`}>
                  {loading && grievances.length === 0 ? <p className="p-8 text-center text-[var(--muted)]">Loading queue...</p> : orderedGrievances.length === 0 ? <p className="p-8 text-center text-[var(--muted)]">No grievances match these filters.</p> : orderedGrievances.map(item => (
                    <button key={item.id} onClick={() => { setSelected(item); setNextStatus(''); setNotice(''); }} className={`block w-full p-4 text-left transition hover:bg-white/5 ${selected?.id === item.id ? 'bg-white/7' : ''}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-sm text-[var(--accent-strong)]">{item.trackingCode}</span>
                        <div className="flex flex-wrap justify-end gap-2"><span className="rounded-full border border-white/10 px-2 py-1 text-xs">{formatLabel(item.status)}</span>{escalationText(item, now) && <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${escalationText(item, now) === 'AUTO-ESCALATED' ? 'border-red-400/40 bg-red-500/15 text-red-300' : 'border-amber-400/30 bg-amber-500/10 text-amber-200'}`}>{escalationText(item, now)}</span>}<span className="rounded-full px-2 py-1 text-xs font-semibold" style={{ color: priorityColor[item.priority], backgroundColor: `${priorityColor[item.priority]}18` }}>{item.priority}</span></div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-white/90">{item.description || 'Complaint details unavailable'}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--muted)]"><span>{formatLabel(item.departmentCode)}</span><span>{item.confidence != null ? `${Math.round(item.confidence * 100)}% AI confidence` : 'Awaiting classification'}</span>{item.sentiment && <span className={item.sentiment === 'FRUSTRATED' ? 'text-amber-300' : ''}>{formatLabel(item.sentiment)} citizen</span>}<span>{new Date(item.createdAt).toLocaleString()}</span></div>
                    </button>
                  ))}
                </div>

                <aside className={`${panelClass} h-fit p-5 xl:sticky xl:top-24`}>
                  {!selected ? <p className="py-16 text-center text-sm text-[var(--muted)]">Select a grievance to review and act.</p> : <div className="space-y-5">
                    <div><p className="font-mono text-[var(--accent-strong)]">{selected.trackingCode}</p><h2 className="mt-1 text-lg font-semibold">Complaint review</h2></div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-white/90">{selected.description}</p>
                    <dl className="grid grid-cols-2 gap-3 text-xs"><div><dt className="text-[var(--muted)]">Department</dt><dd>{formatLabel(selected.departmentCode)}</dd></div><div><dt className="text-[var(--muted)]">Status</dt><dd>{formatLabel(selected.status)}</dd></div><div><dt className="text-[var(--muted)]">Priority</dt><dd>{selected.priority}</dd></div><div><dt className="text-[var(--muted)]">AI language</dt><dd>{selected.detectedLanguage || 'Auto detected'}</dd></div><div><dt className="text-[var(--muted)]">Citizen distress</dt><dd className={selected.sentiment === 'FRUSTRATED' ? 'font-semibold text-amber-300' : ''}>{formatLabel(selected.sentiment || 'NEUTRAL')}</dd></div><div><dt className="text-[var(--muted)]">Assigned officer</dt><dd className="truncate">{selected.assignedOfficerId || 'Unassigned'}</dd></div></dl>

                    {selected.status === 'PENDING_REVIEW' && <div className="space-y-3 border-t border-[var(--border)] pt-4">
                      <h3 className="text-sm font-semibold">Human routing review</h3>
                      <select className={`${fieldClass} w-full`} value={reviewDepartment} onChange={event => setReviewDepartment(event.target.value as DepartmentCode)}>{departmentOptions.map(value => <option key={value}>{value}</option>)}</select>
                      <textarea className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm" placeholder="Reason for confirmation or correction" value={reviewReason} onChange={event => setReviewReason(event.target.value)} />
                      <div className="flex flex-wrap gap-2"><Button size="sm" disabled={saving} onClick={() => void runAction(() => reviewGrievance(selected.id, 'APPROVE', undefined, reviewReason), 'AI route confirmed.')}>Confirm route</Button><Button size="sm" variant="secondary" disabled={saving || !reviewReason.trim()} onClick={() => void runAction(() => reviewGrievance(selected.id, 'OVERRIDE', reviewDepartment, reviewReason), 'Route corrected and audited.')}>Correct route</Button></div>
                    </div>}

                    {canAssign && <div className="space-y-3 border-t border-[var(--border)] pt-4"><h3 className="text-sm font-semibold">Assignment</h3><select className={`${fieldClass} w-full`} value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Select officer</option>{officers.filter(officer => !selected.departmentCode || officer.departmentCode === selected.departmentCode).map(officer => <option key={officer.id} value={officer.id}>{officer.name} · {formatLabel(officer.departmentCode)}</option>)}</select><Button size="sm" variant="secondary" disabled={saving || !assignee} onClick={() => void runAction(() => assignGrievance(selected.id, assignee), 'Officer assigned and notified.')}>Assign officer</Button></div>}

                    <div className="space-y-3 border-t border-[var(--border)] pt-4"><h3 className="text-sm font-semibold">Status workflow</h3>{nextStatuses[selected.status].length ? <><select className={`${fieldClass} w-full`} value={nextStatus} onChange={event => setNextStatus(event.target.value as GrievanceStatus)}><option value="">Select valid next status</option>{nextStatuses[selected.status].map(value => <option key={value}>{value}</option>)}</select><input className={`${fieldClass} w-full`} placeholder="Citizen-visible update note" value={statusNote} onChange={event => setStatusNote(event.target.value)} /><Button size="sm" disabled={saving || !nextStatus} onClick={() => void runAction(() => updateGrievanceStatus(selected.id, nextStatus as GrievanceStatus, statusNote), 'Status updated and citizen notified.')}>Update status</Button></> : <p className="text-xs text-[var(--muted)]">This grievance is in a terminal state.</p>}</div>
                  </div>}
                </aside>
              </div>
            </div>
          )}

          {section === 'map' && <div className="space-y-4"><div><h1 className="text-2xl font-bold">Live operational issue map</h1><p className="text-sm text-[var(--muted)]">The same clustered civic map as the public app, enhanced with role-scoped exact coordinates and direct work-item access.</p></div><PublicIssueMap issues={mapIssues} staffMode onIssueSelect={issue => void openMapIssue(issue)} /></div>}

          {section === 'analytics' && canSeeAnalytics && <div className="space-y-5"><div><h1 className="text-2xl font-bold">Service analytics</h1><p className="text-sm text-[var(--muted)]">Live figures from the grievance database.</p></div>{analytics ? <><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[['Total complaints', analytics.totalComplaints], ['Pending work', analytics.pendingCount], ['Resolved', analytics.resolvedCount], ['Emergencies', analytics.emergencyCount]].map(([label, value]) => <div key={label} className={`${panelClass} p-5`}><p className="text-sm text-[var(--muted)]">{label}</p><p className="mt-2 text-3xl font-bold">{value}</p></div>)}</div><div className="grid gap-4 xl:grid-cols-3">{([['By status', analytics.byStatus], ['By department', analytics.byDepartment], ['By priority', analytics.byPriority]] as const).map(([title, data]) => <div key={title} className={`${panelClass} p-5`}><h2 className="mb-4 font-semibold">{title}</h2><div className="space-y-3">{Object.entries(data).map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{formatLabel(label)}</span><span>{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--accent),var(--accent-ai))]" style={{ width: `${Math.max(4, value / Math.max(analytics.totalComplaints, 1) * 100)}%` }} /></div></div>)}</div></div>)}</div></> : <p className={`${panelClass} p-8 text-[var(--muted)]`}>Analytics are loading.</p>}</div>}

          {section === 'admin' && isAdmin && (
            <div className="space-y-5">
              <div><h1 className="text-2xl font-bold">Administration</h1><p className="text-sm text-[var(--muted)]">Manage departments, provision staff and review security-sensitive activity.</p></div>

              <section>
                <h2 className="mb-3 font-semibold">Departments</h2>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {departmentOptions.map(department => {
                    const staffCount = adminUsers.filter(account => account.departmentCode === department).length;
                    const issueCount = analytics?.byDepartment[department] || 0;
                    return (
                      <div key={department} className={`${panelClass} p-4`}>
                        <Building2 className="h-5 w-5 text-[var(--accent-strong)]" />
                        <h3 className="mt-3 text-sm font-semibold">{formatLabel(department)}</h3>
                        <div className="mt-3 flex gap-4 text-xs text-[var(--muted)]"><span><b className="block text-lg text-white">{issueCount}</b>issues</span><span><b className="block text-lg text-white">{staffCount}</b>staff</span></div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
                <form className={`${panelClass} space-y-3 p-5`} onSubmit={createUser}>
                  <h2 className="font-semibold">Create staff account</h2>
                  <input required className={`${fieldClass} w-full`} placeholder="Full name" value={staffForm.name} onChange={event => setStaffForm(current => ({ ...current, name: event.target.value }))} />
                  <input required type="email" className={`${fieldClass} w-full`} placeholder="Government email" value={staffForm.email} onChange={event => setStaffForm(current => ({ ...current, email: event.target.value }))} />
                  <input required type="password" minLength={12} className={`${fieldClass} w-full`} placeholder="Strong 12+ character password" value={staffForm.password} onChange={event => setStaffForm(current => ({ ...current, password: event.target.value }))} />
                  <select className={`${fieldClass} w-full`} value={staffForm.role} onChange={event => setStaffForm(current => ({ ...current, role: event.target.value as CreateStaffPayload['role'] }))}>{['OFFICER', 'DEPARTMENT_HEAD', 'ADMIN', 'COMMISSIONER'].map(role => <option key={role}>{role}</option>)}</select>
                  {['OFFICER', 'DEPARTMENT_HEAD'].includes(staffForm.role) && <select className={`${fieldClass} w-full`} value={staffForm.departmentCode} onChange={event => setStaffForm(current => ({ ...current, departmentCode: event.target.value as DepartmentCode }))}>{departmentOptions.map(value => <option key={value}>{value}</option>)}</select>}
                  <Button type="submit" disabled={saving}>Create account</Button>
                </form>
                <div className={`${panelClass} overflow-x-auto p-5`}>
                  <h2 className="mb-4 font-semibold">Active users</h2>
                  <table className="w-full min-w-[560px] text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="pb-3">Name</th><th>Email</th><th>Role</th><th>Department</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{adminUsers.map(account => <tr key={account.id}><td className="py-3">{account.name}</td><td>{account.email}</td><td>{formatLabel(account.role)}</td><td>{formatLabel(account.departmentCode)}</td></tr>)}</tbody></table>
                </div>
              </div>
              <div className={`${panelClass} overflow-x-auto p-5`}>
                <h2 className="mb-4 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Recent audit activity</h2>
                <table className="w-full min-w-[650px] text-left text-sm"><thead className="text-xs text-[var(--muted)]"><tr><th className="pb-3">Time</th><th>Action</th><th>Target</th><th>Details</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{auditEvents.slice(0, 50).map(event => <tr key={event.id}><td className="py-3 text-xs">{new Date(event.createdAt).toLocaleString()}</td><td>{formatLabel(event.action)}</td><td>{event.targetType}</td><td className="max-w-md truncate">{event.details}</td></tr>)}</tbody></table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
