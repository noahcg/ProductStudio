import type { Domain, Project } from "../domain";

/** Include project-form domains without inventing renewal or certificate data. */
export function projectDomains(projects: Project[], stored: Domain[]): Domain[] {
  const result = [...stored];
  for (const project of projects) {
    if (!project.domain?.trim()) continue;
    try {
      const raw = project.domain.trim();
      const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      const name = url.hostname.toLowerCase();
      if (result.some((d) => d.projectId === project.id && d.name.toLowerCase() === name)) continue;
      result.push({ id: `project-domain-${project.id}`, projectId: project.id, name, sslStatus: "unknown" });
    } catch { /* Invalid URLs are not turned into links or monitoring records. */ }
  }
  return result;
}
