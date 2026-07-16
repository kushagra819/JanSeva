import { ArrowRightCircle } from "lucide-react";

import { Card } from "../ui/card";

export function RoutePlaceholder({
  eyebrow,
  title,
  description,
  callout,
}: {
  eyebrow: string;
  title: string;
  description: string;
  callout: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <section className="surface-panel rounded-[2rem] p-8 sm:p-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[var(--accent-strong)]">{eyebrow}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]">{description}</p>
      </section>
      <Card className="rounded-[1.5rem] p-6">
        <div className="flex items-start gap-4">
          <ArrowRightCircle className="mt-1 h-5 w-5 text-[var(--accent-strong)]" />
          <div>
            <h2 className="text-lg font-semibold text-white">Implementation note</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{callout}</p>
          </div>
        </div>
      </Card>
    </main>
  );
}
