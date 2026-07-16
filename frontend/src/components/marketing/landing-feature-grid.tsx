import { BrainCircuit, Building2, Map, MessageSquareText, Shield, Workflow } from "lucide-react";

import { Reveal } from "./reveal";
import { Card } from "../ui/card";
import { SectionHeading } from "../ui/section-heading";
import { aiCapabilities, featureCards } from "../../data/landing";

const featureIcons = [MessageSquareText, BrainCircuit, Workflow, Building2, Map, Shield] as const;

export function LandingFeatureGrid() {
  return (
    <section id="capabilities" className="section-divider pt-10">
      <Reveal>
        <SectionHeading
          eyebrow="Capability stack"
          title="Built for citizens, departments, and city administrators"
          description="The interface feels polished and modern, while the system underneath is structured for routing, accountability, and future AI upgrades."
        />
      </Reveal>
      <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {featureCards.map((card, index) => {
            const Icon = featureIcons[index];

            return (
              <Reveal key={card.title} delay={0.05 * index}>
                <Card className="h-full rounded-[1.6rem] p-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                    <Icon className="h-5 w-5 text-[var(--accent-strong)]" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.description}</p>
                </Card>
              </Reveal>
            );
          })}
        </div>
        <Reveal delay={0.12}>
          <Card className="rounded-[1.8rem] p-6">
            <p className="text-xs uppercase tracking-[0.24em] text-[var(--accent-ai)]">AI capabilities</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Practical automation for the hackathon demo, extensible for real deployment</h3>
            <div className="mt-6 space-y-3">
              {aiCapabilities.map((capability) => (
                <div key={capability.title} className="rounded-[1.25rem] border border-white/8 bg-white/4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold text-white">{capability.title}</h4>
                      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{capability.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[var(--accent-strong)]">
                      active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}
