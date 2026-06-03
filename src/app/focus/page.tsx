import { Suspense } from "react";
import { FocusBoard } from "@/components/focus/focus-board";
import {
  getProjects,
  getMilestones,
  getTasks,
  getFocusResult,
  getProjectHealth,
  getDomains,
  getVercelStatuses,
  getSupabaseStatuses,
} from "@/lib/data";

// Tasks are editable here — render per request so changes reflect immediately.
export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const [projects, milestones, tasks, result, health, domains, vercel, supabase] = await Promise.all([
    getProjects(),
    getMilestones(),
    getTasks(),
    getFocusResult(),
    getProjectHealth(),
    getDomains(),
    getVercelStatuses(),
    getSupabaseStatuses(),
  ]);

  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading focus…</div>}>
      <FocusBoard
        projects={projects}
        ranked={result.ranked}
        milestones={milestones}
        tasks={tasks}
        health={health}
        domains={domains}
        vercel={vercel}
        supabase={supabase}
      />
    </Suspense>
  );
}
