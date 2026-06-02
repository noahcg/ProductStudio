"use client";

import { useEffect, useState } from "react";

function partOfDay(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Greeting reflects the viewer's real local time of day (consistent with the
 * live header clock). Renders a stable default on the server, then refines to
 * the actual part-of-day on mount. The owner's name is passed in from the
 * data layer.
 */
export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("Good afternoon");
  useEffect(() => {
    setGreeting(`Good ${partOfDay(new Date().getHours())}`);
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-fg">
        {greeting}, {name}.
      </h1>
      <p className="mt-1.5 text-sm text-muted">Here&apos;s what&apos;s happening across your products.</p>
    </div>
  );
}
