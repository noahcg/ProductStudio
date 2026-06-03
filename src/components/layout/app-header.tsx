"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";
import { SettingsMenu } from "./settings-menu";

const NAV = [
  { href: "/", label: "Studio" },
  { href: "/focus", label: "Focus" },
  { href: "/roadmaps", label: "Roadmaps" },
  { href: "/decisions", label: "Decisions" },
  { href: "/signals", label: "Signals" },
  { href: "/money", label: "Money" },
];

/**
 * Live wall clock for the header. Renders nothing until mounted so the
 * server/client markup matches, then ticks once a minute.
 *
 * Note: this is real time, deliberately independent of the studio data anchor
 * in `lib/clock.ts` (which keeps the mock "2d ago" labels stable). The header
 * shows "now"; the dashboard data is demo data fixed to June 2026.
 */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export function AppHeader({
  brand,
  notifications,
}: {
  brand: string;
  notifications: number;
}) {
  const pathname = usePathname();
  const now = useClock();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[1400px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-script text-2xl text-fg">{brand}</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-faint">
            Product Studio
          </span>
        </Link>

        {/* Nav */}
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
                  active ? "text-fg" : "text-muted hover:text-fg"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-3 -bottom-[1px] h-0.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium text-fg">
              {now
                ? now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : " "}
            </div>
            <div className="text-xs text-muted">
              {now
                ? now.toLocaleTimeString("en-US", {
                    weekday: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : " "}
            </div>
          </div>
          <ThemeToggle />
          <SettingsMenu />
          <button
            aria-label="Notifications"
            className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-fg"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-semibold text-accent-fg">
              {notifications}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
