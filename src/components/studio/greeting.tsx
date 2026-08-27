"use client";

import { useSyncExternalStore } from "react";

function partOfDay(hour: number) {
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

const subscribeGreeting = () => () => {};
const getGreetingSnapshot = () => `Good ${partOfDay(new Date().getHours())}`;
const getServerGreetingSnapshot = () => "Good afternoon";

/**
 * Greeting reflects the viewer's real local time-of-day bucket, matching the
 * atmospheric background. Renders a stable default on the server, then refines
 * to the actual part-of-day on mount. The owner's name is passed in from the
 * data layer.
 */
export function Greeting({ name }: { name: string }) {
  const greeting = useSyncExternalStore(
    subscribeGreeting,
    getGreetingSnapshot,
    getServerGreetingSnapshot
  );

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-fg">
        {greeting}, {name}.
      </h1>
      <p className="mt-1.5 text-sm text-muted">Here&apos;s what&apos;s happening across your products.</p>
    </div>
  );
}
