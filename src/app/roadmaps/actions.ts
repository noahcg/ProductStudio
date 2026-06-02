"use server";

import { revalidatePath } from "next/cache";
import type { RoadmapInput, RoadmapColumn } from "@/lib/domain";
import {
  getRoadmap,
  createRoadmapItem,
  updateRoadmapItem,
  deleteRoadmapItem,
  setRoadmapPlacement,
} from "@/lib/data";
import { moveItem, reorderItem } from "@/components/roadmaps/roadmap-ops";

export type ActionResult = { ok: true } | { ok: false; error: string };

function validate(input: RoadmapInput): string | null {
  if (!input.projectId) return "A project is required.";
  if (!input.title?.trim()) return "Title is required.";
  return null;
}

export async function createRoadmapAction(input: RoadmapInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await createRoadmapItem(input);
    revalidatePath("/roadmaps");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to create item." };
  }
}

export async function updateRoadmapAction(id: string, input: RoadmapInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await updateRoadmapItem(id, input);
    revalidatePath("/roadmaps");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to update item." };
  }
}

export async function deleteRoadmapAction(id: string): Promise<ActionResult> {
  try {
    await deleteRoadmapItem(id);
    revalidatePath("/roadmaps");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to delete item." };
  }
}

export async function moveRoadmapAction(id: string, column: RoadmapColumn): Promise<ActionResult> {
  try {
    const { updates } = moveItem(await getRoadmap(), id, column);
    if (updates.length) await setRoadmapPlacement(updates);
    revalidatePath("/roadmaps");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to move item." };
  }
}

export async function reorderRoadmapAction(
  id: string,
  direction: "up" | "down"
): Promise<ActionResult> {
  try {
    const { updates } = reorderItem(await getRoadmap(), id, direction);
    if (updates.length) await setRoadmapPlacement(updates);
    revalidatePath("/roadmaps");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to reorder item." };
  }
}
