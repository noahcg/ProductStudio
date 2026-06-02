import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/* ---------- Card ---------- */

export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-line bg-surface/70 backdrop-blur-sm",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.03)_inset,0_18px_40px_-24px_rgba(0,0,0,0.6)]",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between px-5 pt-5", className)}>
      <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
      {action}
    </div>
  );
}

/* ---------- Badge ---------- */

const badgeTones = {
  active: "bg-success/15 text-success ring-success/25",
  planning: "bg-info/15 text-info ring-info/25",
  content: "bg-warning/15 text-warning ring-warning/25",
  high: "bg-success/15 text-success ring-success/25",
  neutral: "bg-surface-2 text-muted ring-line-strong",
  violet: "bg-accent/15 text-accent ring-accent/30",
} as const;

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: keyof typeof badgeTones;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide ring-1 ring-inset",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Progress ---------- */

export function Progress({
  value,
  color = "var(--accent)",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

/* ---------- Buttons / links ---------- */

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50";

const buttonVariants = {
  primary: "bg-accent text-accent-fg hover:bg-accent/90 px-4 py-2",
  subtle: "bg-surface-2 text-fg hover:bg-line ring-1 ring-inset ring-line-strong px-3.5 py-1.5",
  ghost: "text-muted hover:text-fg px-2 py-1",
  link: "text-info hover:text-info/80 p-0",
} as const;

export function Button({
  variant = "subtle",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: keyof typeof buttonVariants }) {
  return <button className={cn(buttonBase, buttonVariants[variant], className)} {...props} />;
}

export function LinkButton({
  variant = "link",
  className,
  href,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: keyof typeof buttonVariants }) {
  return (
    <Link href={href} className={cn(buttonBase, buttonVariants[variant], className)} {...props} />
  );
}

/* ---------- Status dot ---------- */

export function StatusDot({ tone }: { tone: "ok" | "warn" | "down" }) {
  const color = tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-danger";
  return (
    <span className="relative flex h-2.5 w-2.5">
      {tone === "ok" && (
        <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-40", color)} />
      )}
      <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", color)} />
    </span>
  );
}

/* ---------- Page heading ---------- */

export function PageHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
