"use server";

import { revalidatePath } from "next/cache";
import type { TaskInput, TaskStatus } from "@/lib/domain";
import { createTask, updateTask, deleteTask, setTaskStatus } from "@/lib/data";

export type ActionResult = { ok: true } | { ok: false; error: string };

function validate(input: TaskInput): string | null {
  if (!input.projectId) return "A project is required.";
  if (!input.title?.trim()) return "Title is required.";
  return null;
}

export async function createTaskAction(input: TaskInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await createTask(input);
    revalidatePath("/focus");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to create task." };
  }
}

export async function updateTaskAction(id: string, input: TaskInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await updateTask(id, input);
    revalidatePath("/focus");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to update task." };
  }
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  try {
    await deleteTask(id);
    revalidatePath("/focus");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to delete task." };
  }
}

export async function setTaskStatusAction(id: string, status: TaskStatus): Promise<ActionResult> {
  try {
    await setTaskStatus(id, status);
    revalidatePath("/focus");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to update task." };
  }
}
