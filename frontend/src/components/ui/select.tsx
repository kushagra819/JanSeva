import type { SelectHTMLAttributes } from "react";

import { cn } from "../../utils/utils";

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-12 w-full rounded-2xl border border-white/10 bg-[rgba(7,17,31,0.7)] px-4 text-sm text-white outline-none transition focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-strong)]/20",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
