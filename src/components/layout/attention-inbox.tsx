"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ArrowRight, Compass, X } from "lucide-react";
import type { AttentionInbox as Inbox, AttentionItem } from "@/lib/attention/inbox";
import type { SignalSeverity } from "@/lib/signals/engine";
import { severityMeta } from "@/components/signals/severity";
import { cn, relativeTime } from "@/lib/utils";
import { setLocalStorageValue, useLocalStorageValue } from "@/lib/client-store";

const GROUPS: { severity: SignalSeverity; label: string }[] = [
  { severity: "critical", label: "Critical" },
  { severity: "warning", label: "Warning" },
  { severity: "watch", label: "Watch" },
];

const DISMISSED_KEY = "product-studio-dismissed-attention";
const REVIEW_ITEM_ID = "weekly-review";

function parseDismissed(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  setLocalStorageValue(DISMISSED_KEY, JSON.stringify(ids));
}

/**
 * Attention Inbox — the header bell. Opens a compact dropdown summarizing the
 * signals that may need review (critical / warning / watch) plus Weekly Review
 * availability. Not a generic notifications system; derived from existing data.
 */
export function AttentionInbox({ inbox }: { inbox: Inbox }) {
  const [open, setOpen] = useState(false);
  const dismissedValue = useLocalStorageValue(DISMISSED_KEY, "[]");
  const dismissed = useMemo(() => parseDismissed(dismissedValue), [dismissedValue]);
  const ref = useRef<HTMLDivElement>(null);
  const dismissedSet = new Set(dismissed);
  const visibleItems = inbox.items.filter((item) => !dismissedSet.has(item.id));
  const reviewVisible = inbox.reviewReady && !dismissedSet.has(REVIEW_ITEM_ID);
  const critical = visibleItems.filter((i) => i.severity === "critical").length;
  const warning = visibleItems.filter((i) => i.severity === "warning").length;
  const count = critical + warning + (reviewVisible ? 1 : 0);

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
  const dismiss = (id: string) => {
    if (dismissed.includes(id)) return;
    writeDismissed([...dismissed, id]);
  };
  const clearVisible = () => {
    const ids = [
      ...visibleItems.map((item) => item.id),
      ...(reviewVisible ? [REVIEW_ITEM_ID] : []),
    ];
    writeDismissed([...new Set([...dismissed, ...ids])]);
  };

  return (
    <div ref={ref} className="relative">
      <button
        aria-label={`Attention Inbox${count > 0 ? `, ${count} item${count === 1 ? "" : "s"}` : ", no items"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-fg"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-fg">
            {count}
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-fg">Attention Inbox</div>
                <div className="text-xs text-muted">Signals that may need review</div>
              </div>
              {(visibleItems.length > 0 || reviewVisible) && (
                <button
                  type="button"
                  onClick={clearVisible}
                  className="rounded-md px-2 py-1 text-xs font-medium text-faint transition-colors hover:bg-surface-2 hover:text-fg"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {visibleItems.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="text-sm font-medium text-fg">All calm.</div>
                <p className="mt-1 text-xs text-muted">No visible attention items right now.</p>
              </div>
            ) : (
              GROUPS.map(({ severity, label }) => {
                const items = visibleItems.filter((i) => i.severity === severity);
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
                        <InboxRow
                          key={item.id}
                          item={item}
                          onDismiss={() => dismiss(item.id)}
                          onNavigate={close}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </div>

          {reviewVisible && (
            <div className="flex items-center gap-2.5 border-t border-line px-4 py-3 transition-colors hover:bg-surface-2/50">
              <Link href="/review" onClick={close} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Compass className="h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-fg">Weekly review ready</span>
                  <span className="block truncate text-xs text-muted">
                    {inbox.reviewRecommendation ? `Recommended focus: ${inbox.reviewRecommendation}` : "Your portfolio at a glance"}
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-faint" />
              </Link>
              <button
                type="button"
                aria-label="Clear weekly review"
                onClick={() => dismiss(REVIEW_ITEM_ID)}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-faint transition-colors hover:bg-surface hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InboxRow({
  item,
  onDismiss,
  onNavigate,
}: {
  item: AttentionItem;
  onDismiss: () => void;
  onNavigate: () => void;
}) {
  return (
    <li>
      <div className="rounded-lg px-2 py-2 transition-colors hover:bg-surface-2/40">
        <div className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-medium text-fg">{item.title}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {item.createdAt && (
              <span className="text-[10px] text-faint">{relativeTime(item.createdAt)}</span>
            )}
            <button
              type="button"
              aria-label={`Clear ${item.title}`}
              onClick={onDismiss}
              className="grid h-5 w-5 place-items-center rounded text-faint transition-colors hover:bg-surface hover:text-fg"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
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
