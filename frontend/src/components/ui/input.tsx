import type { InputHTMLAttributes } from "react";

import { cn } from "../../utils/utils";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-2xl border border-white/10 bg-[rgba(7,17,31,0.7)] px-4 text-sm text-white outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-strong)]/20",
        className,
      )}
      {...props}
    />
  );
}
