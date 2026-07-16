import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}
