import { Suspense } from "react";
import { FocusBoard } from "@/components/focus/focus-board";
import { getProjects, getFocus, getFocusResult } from "@/lib/data";

export default async function FocusPage() {
  // Focus Engine ranking + current focus are computed server-side; the
  // interactive board receives them as props.
  const [projects, baseFocus, result] = await Promise.all([
    getProjects(),
    getFocus(),
    getFocusResult(),
  ]);

  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading focus…</div>}>
      <FocusBoard projects={projects} ranked={result.ranked} baseFocus={baseFocus} />
    </Suspense>
  );
}
