import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../utils/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[8rem] w-full rounded-[1.75rem] border border-white/10 bg-[rgba(7,17,31,0.76)] px-4 py-4 text-sm leading-7 text-white outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--accent-strong)] focus:ring-2 focus:ring-[var(--accent-strong)]/20",
        className,
      )}
      {...props}
    />
  );
}
