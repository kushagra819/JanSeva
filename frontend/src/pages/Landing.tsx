import { Link } from 'react-router';
import { BellRing, Building2, ChevronRight, MapPinned, Search, Send, ShieldCheck } from 'lucide-react';
import { PublicIssueMap } from '../components/map/PublicIssueMap';
import janSevaLogo from '../assets/jandhwani-logo.jpeg';

const actions = [
  { icon: Send, title: 'Raise an issue', text: 'Share the problem and its location.', href: '/citizen/submit', action: 'Report now' },
  { icon: Search, title: 'Track progress', text: 'Follow every update using your account.', href: '/citizen/complaints', action: 'Track issue' },
  { icon: MapPinned, title: 'See it on the map', text: 'Explore privacy-safe live issue locations.', href: '#issue-map', action: 'Open map' },
  { icon: BellRing, title: 'Know when resolved', text: 'Receive an update as the status changes.', href: '/citizen/notifications', action: 'View updates' }
];

export const Landing = () => {
  return (
    <div className="min-h-screen bg-[#07101d] text-white">
      <header className="sticky top-0 z-[1100] border-b border-white/10 bg-[#07101d]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="JanDhwani home">
            <img src={janSevaLogo} alt="JanDhwani" className="h-9 w-auto object-contain" />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Portal sign in">
            <Link to="/login?portal=citizen" className="rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white">Citizen</Link>
            <Link to="/login?portal=department" className="hidden rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white sm:block">Department</Link>
            <Link to="/login?portal=admin" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm transition hover:bg-white/10">Admin</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden px-4 pb-14 pt-16 sm:px-6 sm:pt-24 lg:px-8">
          <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[110px]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" /> Live civic issue tracking
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Report. Track. Resolve.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">One simple place to raise a civic issue, follow the response and see what is happening around you.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/citizen/submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold shadow-lg shadow-blue-700/20 transition hover:bg-blue-500">Raise an issue <ChevronRight className="h-4 w-4" /></Link>
              <Link to="/citizen/complaints" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold transition hover:bg-white/10"><Search className="h-4 w-4" /> Track my issue</Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8" aria-label="JanDhwani actions">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map(item => (
              <Link key={item.title} to={item.href} className="group rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30 hover:bg-white/[.06]">
                <item.icon className="h-6 w-6 text-blue-400" />
                <h2 className="mt-4 font-semibold">{item.title}</h2>
                <p className="mt-2 min-h-10 text-sm leading-5 text-slate-400">{item.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-300">{item.action}<ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section id="issue-map" className="scroll-mt-20 border-y border-white/10 bg-black/10 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="mb-2 text-sm font-semibold uppercase tracking-[.18em] text-blue-400">Live India view</p><h2 className="text-3xl font-bold">Civic issues across India</h2><p className="mt-2 max-w-2xl text-sm text-slate-400">Zoom in to separate area totals into clickable issue markers. The map refreshes automatically.</p></div>
              <Link to="/login?portal=citizen" className="inline-flex items-center gap-2 text-sm font-medium text-blue-300">Sign in to report <ChevronRight className="h-4 w-4" /></Link>
            </div>
            <PublicIssueMap />
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-4 py-14 sm:px-6 md:grid-cols-2 lg:px-8">
          <Link to="/login?portal=department" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:bg-white/[.06]"><span className="flex items-center gap-4"><Building2 className="h-7 w-7 text-violet-400" /><span><b className="block">Department portal</b><small className="text-slate-400">Manage assigned issues and update citizens</small></span></span><ChevronRight /></Link>
          <Link to="/login?portal=admin" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[.035] p-5 transition hover:bg-white/[.06]"><span className="flex items-center gap-4"><ShieldCheck className="h-7 w-7 text-emerald-400" /><span><b className="block">Admin portal</b><small className="text-slate-400">Manage departments, staff and service performance</small></span></span><ChevronRight /></Link>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-sm text-slate-500">JanDhwani · Simple, transparent civic issue resolution</footer>
    </div>
  );
};
