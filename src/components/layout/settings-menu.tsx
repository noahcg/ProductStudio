"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const KEY = "ps-atmosphere";

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [atmosphere, setAtmosphere] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    setAtmosphere(!document.documentElement.classList.contains("atmosphere-off"));
  }, []);

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

  function setEnabled(enabled: boolean) {
    setAtmosphere(enabled);
    document.documentElement.classList.toggle("atmosphere-off", !enabled);
    try {
      localStorage.setItem(KEY, enabled ? "on" : "off");
    } catch {}
  }

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Settings"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-muted transition-colors hover:text-fg"
      >
        <Settings className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-line bg-bg-elevated p-4 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]"
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-faint">Appearance</div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-fg">Background Atmosphere</div>
              <p className="mt-0.5 text-xs text-muted">
                {mounted && atmosphere
                  ? "Studio scene behind the interface."
                  : "Plain Product Studio background."}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={mounted ? atmosphere : true}
              aria-label="Background Atmosphere"
              onClick={() => setEnabled(!atmosphere)}
              className={cn(
                "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors",
                mounted && atmosphere ? "bg-accent" : "bg-line-strong"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
                  mounted && atmosphere ? "left-[22px]" : "left-0.5"
                )}
              />
            </button>
          </div>

          <p className="mt-3 border-t border-line pt-3 text-[11px] text-faint">
            Atmosphere shows in dark mode. Default: Enabled.
          </p>
        </div>
      )}
    </div>
  );
}
