import { ArrowRight, BotMessageSquare, ClipboardPenLine, Route, ScanEye } from "lucide-react";

import { Reveal } from "./reveal";
import { Card } from "../ui/card";
import { SectionHeading } from "../ui/section-heading";
import { processSteps } from "../../data/landing";

const icons = [ClipboardPenLine, BotMessageSquare, Route, ScanEye] as const;

export function LandingProcess() {
  return (
    <section id="how-it-works" className="section-divider pt-10">
      <Reveal>
        <SectionHeading
          eyebrow="How it works"
          title="Four clear steps from complaint to closure"
          description="The experience keeps technical complexity behind the scenes while making the journey visible and trustworthy."
        />
      </Reveal>
      <div className="mt-6 grid gap-4 xl:grid-cols-4">
        {processSteps.map((step, index) => {
          const Icon = icons[index];

          return (
            <Reveal key={step.title} delay={0.06 * index}>
              <Card className="flex h-full flex-col rounded-[1.6rem] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/6">
                    <Icon className="h-5 w-5 text-[var(--accent-strong)]" />
                  </div>
                  <span className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{step.description}</p>
                {index < processSteps.length - 1 ? (
                  <div className="mt-5 flex items-center gap-2 text-sm text-[var(--accent-strong)]">
                    <span>Next step</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                ) : null}
              </Card>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
