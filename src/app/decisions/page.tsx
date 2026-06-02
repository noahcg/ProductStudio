import { getDecisions, getProjects } from "@/lib/data";
import { DecisionsView } from "@/components/decisions/decisions-view";

// Mutable CRUD surface — render per request so writes are reflected immediately.
export const dynamic = "force-dynamic";

export default async function DecisionsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const [decisions, projects, params] = await Promise.all([
    getDecisions(),
    getProjects(),
    searchParams,
  ]);

  return (
    <DecisionsView
      decisions={decisions}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      initialModal={params?.new ? "new" : null}
    />
  );
}
