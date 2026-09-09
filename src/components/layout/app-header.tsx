"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import type { AttentionInbox as Inbox } from "@/lib/attention/inbox";
import { ThemeToggle } from "./theme-toggle";
import { SettingsMenu } from "./settings-menu";
import { AttentionInbox } from "./attention-inbox";

const NAV = [
  { href: "/", label: "Studio" },
  { href: "/projects", label: "Products" },
  { href: "/roadmaps", label: "Roadmaps" },
  { href: "/decisions", label: "Decisions" },
  { href: "/signals", label: "Signals" },
  { href: "/review", label: "Review" },
  { href: "/money", label: "Money" },
];

/**
 * Live wall clock for the header. Renders nothing until mounted so the
 * server/client markup matches, then ticks once a minute.
 *
 * The rest of the studio uses the same live clock for activity and review data.
 */
let currentClock = new Date();
const getClockSnapshot = () => currentClock;
const getServerClockSnapshot = () => null;
const subscribeClock = (onStoreChange: () => void) => {
  currentClock = new Date();
  const t = setInterval(() => {
    currentClock = new Date();
    onStoreChange();
  }, 30_000);
  return () => clearInterval(t);
};

function useClock() {
  return useSyncExternalStore(subscribeClock, getClockSnapshot, getServerClockSnapshot);
}

export function AppHeader({
  inbox,
}: {
  inbox: Inbox;
}) {
  const pathname = usePathname();
  const now = useClock();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] w-full max-w-[1400px] items-center gap-6 px-6">
        {/* Logo */}
        <Link href="/" className="shrink-0" aria-label="Product Studio home">
          <Image
            src="/images/ng-studio.png?v=20260909-2"
            alt="Noah Glushien Product Studio"
            width={2172}
            height={724}
            sizes="160px"
            priority
            className="h-[60px] w-auto"
          />
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
          <AttentionInbox inbox={inbox} />
        </div>
      </div>
    </header>
  );
}
