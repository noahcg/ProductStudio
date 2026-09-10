import { getProducts, getRoadmap, getProjects } from "@/lib/data";
import { RoadmapsView } from "@/components/roadmaps/roadmaps-view";

// Mutable planning board — render per request so writes are reflected immediately.
export const dynamic = "force-dynamic";

export default async function RoadmapsPage() {
  const [items, products, projects] = await Promise.all([getRoadmap(), getProducts(), getProjects()]);

  return (
    <RoadmapsView
      items={items}
      products={products}
      projects={projects}
    />
  );
}
