"use server";

import { revalidatePath } from "next/cache";
import type { ProjectInput } from "@/lib/domain";
import { createProject, updateProject, deleteProject } from "@/lib/data";

export type ProjectActionResult =
  | { ok: true; projectId?: string }
  | { ok: false; error: string };

function validate(input: ProjectInput): string | null {
  if (!input.name.trim()) return "Project name is required.";
  if (!input.tagline.trim()) return "Tagline is required.";
  if (!input.nextMilestone.trim()) return "Current goal is required.";
  return null;
}

function revalidate() {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath("/focus");
  revalidatePath("/roadmaps");
  revalidatePath("/decisions");
  revalidatePath("/signals");
  revalidatePath("/review");
}

export async function createProjectAction(input: ProjectInput): Promise<ProjectActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    const project = await createProject(input);
    revalidate();
    return { ok: true, projectId: project.id };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to create project." };
  }
}

export async function updateProjectAction(id: string, input: ProjectInput): Promise<ProjectActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await updateProject(id, input);
    revalidate();
    return { ok: true, projectId: id };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to update project." };
  }
}

export async function deleteProjectAction(id: string): Promise<ProjectActionResult> {
  try {
    await deleteProject(id);
    revalidate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to delete project." };
  }
}

