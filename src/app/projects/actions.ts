"use server";

import { revalidatePath } from "next/cache";
import type { ProductInput, ProjectInput } from "@/lib/domain";
import { createProduct, updateProduct, createProject, updateProject, deleteProject } from "@/lib/data";

export type ProjectActionResult =
  | { ok: true; projectId?: string }
  | { ok: false; error: string };

function validate(input: ProjectInput): string | null {
  if (!input.name.trim()) return "Project name is required.";
  if (!input.productId) return "Choose a product first.";
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

export async function createProductAction(input: ProductInput): Promise<ProjectActionResult> {
  if (!input.name.trim()) return { ok: false, error: "Product name is required." };
  try {
    const product = await createProduct(input);
    revalidate();
    return { ok: true, projectId: product.id };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to create product." };
  }
}

export async function updateProductAction(id: string, input: ProductInput): Promise<ProjectActionResult> {
  if (!input.name.trim()) return { ok: false, error: "Product name is required." };
  try {
    await updateProduct(id, input);
    revalidate();
    return { ok: true, projectId: id };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to update product." };
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
