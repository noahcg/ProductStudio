"use server";

import { revalidatePath } from "next/cache";
import type { DecisionInput } from "@/lib/domain";
import { createDecision, updateDecision, deleteDecision } from "@/lib/data";

export type ActionResult = { ok: true } | { ok: false; error: string };

function validate(input: DecisionInput): string | null {
  if (!input.title?.trim()) return "Title is required.";
  if (!input.rationale?.trim()) return "Rationale is required.";
  return null;
}

export async function createDecisionAction(input: DecisionInput): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await createDecision(input);
    revalidatePath("/decisions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to create decision." };
  }
}

export async function updateDecisionAction(
  id: string,
  input: DecisionInput
): Promise<ActionResult> {
  const err = validate(input);
  if (err) return { ok: false, error: err };
  try {
    await updateDecision(id, input);
    revalidatePath("/decisions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to update decision." };
  }
}

export async function deleteDecisionAction(id: string): Promise<ActionResult> {
  try {
    await deleteDecision(id);
    revalidatePath("/decisions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message ?? "Failed to delete decision." };
  }
}
