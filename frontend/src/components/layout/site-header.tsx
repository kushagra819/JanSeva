import { useState } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { routeGroups } from "../../data/foundation";
import janSevaLogo from '../../assets/jandhwani-logo.jpeg';

export function SiteHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/6 bg-[rgba(5,11,20,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={janSevaLogo} alt="JanDhwani" className="h-9 w-auto object-contain" />
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
          <Button href="/citizen/complaints" variant="ghost">
            Track Grievance
          </Button>
          <Button href="/citizen/submit">Raise a Grievance</Button>
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
              <Button href="/citizen/complaints" variant="ghost" className="w-full justify-center">
                Track Grievance
              </Button>
              <Button href="/citizen/submit" className="w-full justify-center">
                Raise a Grievance
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
