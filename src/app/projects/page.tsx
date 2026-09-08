import { Suspense } from "react";
import { FocusBoard } from "@/components/focus/focus-board";
import {
  getProjects,
  getProducts,
  getMilestones,
  getTasks,
  getFocusResult,
  getProjectHealth,
  getDomains,
  getVercelStatuses,
  getSupabaseStatuses,
} from "@/lib/data";

// Tasks and notes are edited here — render per request so changes reflect immediately.
export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const [products, projects, milestones, tasks, result, health, domains, vercel, supabase] = await Promise.all([
    getProducts(),
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
    <Suspense fallback={<div className="text-sm text-muted">Loading projects…</div>}>
      <FocusBoard
        products={products}
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
