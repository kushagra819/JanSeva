import { Link } from "react-router";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../../utils/utils";
import { Slot } from "@radix-ui/react-slot";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[linear-gradient(135deg,var(--accent)_0%,var(--accent-ai)_100%)] text-white shadow-[0_16px_42px_rgba(42,127,255,0.28)] hover:brightness-110",
  secondary: "border border-[var(--border-strong)] bg-white/6 text-white hover:bg-white/10",
  ghost: "bg-transparent text-[var(--muted-strong)] hover:bg-slate-100/10 hover:text-white",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

type SharedProps = {
  children: ReactNode;
  className?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
};

type NativeButtonProps = SharedProps & ComponentPropsWithoutRef<"button"> & { href?: string };

export function Button({ className, variant = "primary", size = "md", children, asChild, href, ...rest }: NativeButtonProps) {
  const Comp = asChild ? Slot : "button";
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  if (href) {
    return (
      <Link to={href} className={classes} {...(rest as any)}>
        {children}
      </Link>
    );
  }

  return (
    <Comp className={classes} {...rest}>
      {children}
    </Comp>
  );
}
