import { Suspense } from "react";
import { FocusBoard } from "@/components/focus/focus-board";
import { getProjects, getAlerts, getFocus } from "@/lib/data";

export default async function FocusPage() {
  // Server fetches through the data layer; the interactive board is a client
  // island that receives everything as props (no data-layer import client-side).
  const [projects, alerts, baseFocus] = await Promise.all([
    getProjects(),
    getAlerts(),
    getFocus(),
  ]);

  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading focus…</div>}>
      <FocusBoard projects={projects} alerts={alerts} baseFocus={baseFocus} />
    </Suspense>
  );
}
