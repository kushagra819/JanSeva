import { ArrowUpRight } from "lucide-react";

import { Card } from "../ui/card";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="rounded-[1.5rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <span className="rounded-full border border-white/10 bg-white/6 p-2">
          <ArrowUpRight className="h-4 w-4 text-[var(--accent-strong)]" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{detail}</p>
    </Card>
  );
}
