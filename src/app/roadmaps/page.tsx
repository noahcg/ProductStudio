import { getRoadmap, getProjects } from "@/lib/data";
import { RoadmapsView } from "@/components/roadmaps/roadmaps-view";

// Mutable planning board — render per request so writes are reflected immediately.
export const dynamic = "force-dynamic";

export default async function RoadmapsPage() {
  const [items, projects] = await Promise.all([getRoadmap(), getProjects()]);

  return (
    <RoadmapsView
      items={items}
      projects={projects.map((p) => ({ id: p.id, name: p.name, icon: p.icon, accent: p.accent }))}
    />
  );
}
