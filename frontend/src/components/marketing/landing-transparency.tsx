import { AlertTriangle, BarChart3, CheckCircle2, TimerReset } from "lucide-react";

import { Reveal } from "./reveal";
import { Card } from "../ui/card";
import { SectionHeading } from "../ui/section-heading";
import { transparencyPoints } from "../../data/landing";

const transparencyIcons = [CheckCircle2, TimerReset, AlertTriangle, BarChart3] as const;

export function LandingTransparency() {
  return (
    <section id="transparency" className="section-divider pt-10">
      <Reveal>
        <SectionHeading
          eyebrow="Public transparency"
          title="A system people can trust because progress stays visible"
          description="JanSeva AI is designed to explain what the system understood, where a grievance was routed, and how it moves through the lifecycle."
        />
      </Reveal>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {transparencyPoints.map((item, index) => {
          const Icon = transparencyIcons[index];

          return (
            <Reveal key={item.title} delay={0.06 * index}>
              <Card className="h-full rounded-[1.6rem] p-5">
                <Icon className="h-5 w-5 text-[var(--success)]" />
                <h3 className="mt-5 text-xl font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
