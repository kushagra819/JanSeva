import { ArrowRight, LayoutDashboard, SearchCheck } from "lucide-react";

import { Reveal } from "./reveal";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export function LandingCta() {
  return (
    <section className="section-divider pt-10">
      <Reveal>
        <Card className="rounded-[2rem] p-8 sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[var(--accent-ai)]">Ready to file or track?</p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Start with the citizen journey, then explore officer and admin views for the demo.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
                The platform is structured so each role has a clear surface, and every major action in the grievance lifecycle
                can be demonstrated end to end.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button href="/raise" size="lg">
                  Raise a Grievance
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button href="/track" size="lg" variant="secondary">
                  <SearchCheck className="h-4 w-4" />
                  Track Grievance
                </Button>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-5">
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="h-5 w-5 text-[var(--accent-strong)]" />
                  <p className="text-lg font-semibold text-white">Demo-ready navigation</p>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Citizens, officers, and administrators already have dedicated entry points in the app shell.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-5">
                <p className="text-sm uppercase tracking-[0.22em] text-[var(--muted)]">Next up</p>
                <p className="mt-3 text-lg font-semibold text-white">AI-first grievance composer</p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  The next phase will replace the placeholder raise route with the natural-language complaint experience.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </Reveal>
    </section>
  );
}
