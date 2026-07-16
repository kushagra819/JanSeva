import { useState } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { routeGroups } from "../../data/foundation";

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-[rgba(5,11,20,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(42,127,255,0.28),rgba(141,103,255,0.18))] text-sm font-semibold text-white">
            JS
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] text-[var(--muted-strong)] uppercase">JANSEVA AI</p>
            <p className="text-xs text-[var(--muted)]">Smart civic grievance platform</p>
          </div>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-6 lg:flex">
          <a href="#how-it-works" className="text-sm text-[var(--muted)] transition hover:text-white">
            How It Works
          </a>
          <a href="#capabilities" className="text-sm text-[var(--muted)] transition hover:text-white">
            AI Capabilities
          </a>
          <a href="#transparency" className="text-sm text-[var(--muted)] transition hover:text-white">
            Transparency
          </a>
          {routeGroups.slice(1).map((item) => (
            <Link key={item.href} to={item.href} className="text-sm text-[var(--muted)] transition hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="hidden lg:flex items-center gap-3">
          <Button href="/track" variant="ghost">
            Track Grievance
          </Button>
          <Button href="/citizen/complaint/new">Raise a Grievance</Button>
        </div>

        {/* Mobile menu button */}
        <div className="lg:hidden">
          <button
            type="button"
            className="text-[var(--muted-strong)] hover:text-white focus:outline-none"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-white/6 bg-[rgba(5,11,20,0.95)] px-4 py-6">
          <div className="flex flex-col space-y-4">
            <a href="#how-it-works" className="text-sm text-[var(--muted)] transition hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
              How It Works
            </a>
            <a href="#capabilities" className="text-sm text-[var(--muted)] transition hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
              AI Capabilities
            </a>
            <a href="#transparency" className="text-sm text-[var(--muted)] transition hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
              Transparency
            </a>
            {routeGroups.slice(1).map((item) => (
              <Link key={item.href} to={item.href} className="text-sm text-[var(--muted)] transition hover:text-white" onClick={() => setIsMobileMenuOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="pt-4 flex flex-col gap-3 border-t border-white/10">
              <Button href="/track" variant="ghost" className="w-full justify-center">
                Track Grievance
              </Button>
              <Button href="/citizen/complaint/new" className="w-full justify-center">
                Raise a Grievance
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
