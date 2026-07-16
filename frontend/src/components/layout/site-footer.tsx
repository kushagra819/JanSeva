export function SiteFooter() {
  return (
    <footer className="section-divider mt-12">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[var(--muted)] sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-[var(--muted-strong)]">JanDhwani civic platform</p>
          <p>Phase 1 establishes the design system, route scaffolding, and reusable shell for the full hackathon build.</p>
        </div>
        <p>Frontend scaffold ready. Backend FastAPI wiring is staged for later phases once Python is available.</p>
      </div>
    </footer>
  );
}
