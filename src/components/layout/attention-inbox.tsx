"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ArrowRight, Compass } from "lucide-react";
import type { AttentionInbox as Inbox, AttentionItem } from "@/lib/attention/inbox";
import type { SignalSeverity } from "@/lib/signals/engine";
import { severityMeta } from "@/components/signals/severity";
import { cn, relativeTime } from "@/lib/utils";

const GROUPS: { severity: SignalSeverity; label: string }[] = [
  { severity: "critical", label: "Critical" },
  { severity: "warning", label: "Warning" },
  { severity: "watch", label: "Watch" },
];

/**
 * Attention Inbox — the header bell. Opens a compact dropdown summarizing the
 * signals that may need review (critical / warning / watch) plus Weekly Review
 * availability. Not a generic notifications system; derived from existing data.
 */
export function AttentionInbox({ inbox }: { inbox: Inbox }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Attention Inbox${inbox.count > 0 ? `, ${inbox.count} item${inbox.count === 1 ? "" : "s"}` : ", no items"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-fg"
      >
        <Bell className="h-[18px] w-[18px]" />
        {inbox.count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">
            {inbox.count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Attention Inbox"
          className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-line bg-bg-elevated shadow-[0_10px_30px_-18px_rgba(0,0,0,0.5)]"
        >
          <div className="border-b border-line px-4 py-3">
            <div className="text-sm font-semibold text-fg">Attention Inbox</div>
            <div className="text-xs text-muted">Signals that may need review</div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {inbox.items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-medium text-fg">All calm.</div>
                <p className="mt-1 text-xs text-muted">No critical or warning signals right now.</p>
              </div>
            ) : (
              GROUPS.map(({ severity, label }) => {
                const items = inbox.items.filter((i) => i.severity === severity);
                if (items.length === 0) return null;
                return (
                  <div key={severity} className="px-2 py-2">
                    <div className="flex items-center gap-2 px-2 py-1">
                      <span className={cn("h-2 w-2 rounded-full", severityMeta[severity].dot)} />
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-faint">{label}</span>
                      <span className="text-[11px] text-faint">· {items.length}</span>
                    </div>
                    <ul>
                      {items.map((item) => (
                        <InboxRow key={item.id} item={item} onNavigate={close} />
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          {inbox.reviewReady && (
            <Link
              href="/review"
              onClick={close}
              className="flex items-center gap-2.5 border-t border-line px-4 py-3 transition-colors hover:bg-surface-2/50"
            >
              <Compass className="h-4 w-4 shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-fg">Weekly review ready</span>
                <span className="block truncate text-xs text-muted">
                  {inbox.reviewRecommendation ? `Recommended focus: ${inbox.reviewRecommendation}` : "Your portfolio at a glance"}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-faint" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function InboxRow({ item, onNavigate }: { item: AttentionItem; onNavigate: () => void }) {
  return (
    <li>
      <div className="rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/40">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-fg">{item.title}</span>
          {item.createdAt && (
            <span className="shrink-0 text-[10px] text-faint">{relativeTime(item.createdAt)}</span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.description}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <span className="truncate text-[11px] text-faint">
            {item.projectName ? `${item.projectName} · ` : ""}
            {item.source}
          </span>
          <Link
            href={item.actionHref}
            onClick={onNavigate}
            className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-accent hover:underline"
          >
            {item.actionLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </li>
  );
}
