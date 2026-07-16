import { Bot, Clock3, FileCheck2, ScanSearch } from "lucide-react";

import { Reveal } from "./reveal";
import { Card } from "../ui/card";
import { SectionHeading } from "../ui/section-heading";
import { platformHighlights } from "../../data/landing";

const highlightIcons = [Bot, ScanSearch, FileCheck2, Clock3] as const;

export function LandingStatGrid() {
  return (
    <section className="section-divider pt-10">
      <Reveal>
        <SectionHeading
          eyebrow="Live civic pulse"
          title="A citizen-friendly front end with an operations-grade backend experience"
          description="The platform is designed to feel easy for residents and deeply actionable for officers and administrators."
        />
      </Reveal>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Reveal delay={0.05}>
          <Card className="rounded-[1.75rem] p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {platformHighlights.map((item, index) => {
                const Icon = highlightIcons[index];

                return (
                  <div key={item.label} className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
                    <Icon className="h-5 w-5 text-[var(--accent-strong)]" />
                    <p className="mt-4 text-sm text-[var(--muted)]">{item.label}</p>
                    <p className="mt-2 text-3xl font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.detail}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </Reveal>
        <Reveal delay={0.1}>
          <Card className="rounded-[1.75rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-strong)]">Why this matters</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">From unstructured complaint to accountable resolution</h3>
            <div className="mt-6 space-y-4">
              {[
                "Citizens describe problems in everyday language instead of navigating department jargon.",
                "AI extracts category, urgency, location, and routing recommendations in a transparent flow.",
                "Departments receive better structured cases with cleaner triage and clearer SLA signals.",
              ].map((point) => (
                <div key={point} className="rounded-2xl border border-white/8 bg-white/4 p-4 text-sm leading-6 text-[var(--muted)]">
                  {point}
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
