"use client";

import { useEffect, useState } from "react";

function partOfDay(hour: number) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export function Greeting() {
  // Render a stable greeting on the server, then refine to local time on mount.
  const [greeting, setGreeting] = useState("Good afternoon");
  useEffect(() => {
    setGreeting(`Good ${partOfDay(new Date().getHours())}`);
  }, []);

  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-fg">{greeting}, Noah.</h1>
      <p className="mt-1.5 text-sm text-muted">Here&apos;s what&apos;s happening across your products.</p>
    </div>
  );
}
