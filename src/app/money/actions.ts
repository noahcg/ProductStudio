"use server";

import { revalidatePath } from "next/cache";
import type { ExpenseInput } from "@/lib/domain";
import { createExpense, updateExpense, deleteExpense } from "@/lib/data";

export type ExpenseActionResult = { ok: true } | { ok: false; error: string };

function validate(input: ExpenseInput): string | null {
  if (!input.service.trim()) return "Service name is required.";
  if (!input.category.trim()) return "Category is required.";
  if (!Number.isFinite(input.amount) || input.amount < 0) return "Enter an amount of $0 or more.";
  return null;
}

function revalidate() {
  revalidatePath("/money");
  revalidatePath("/");
  revalidatePath("/signals");
}

export async function createExpenseAction(input: ExpenseInput): Promise<ExpenseActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };
  try {
    await createExpense({ ...input, service: input.service.trim(), category: input.category.trim() });
    revalidate();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Could not add expense." };
  }
}

export async function updateExpenseAction(id: string, input: ExpenseInput): Promise<ExpenseActionResult> {
  const error = validate(input);
  if (error) return { ok: false, error };
  try {
    await updateExpense(id, { ...input, service: input.service.trim(), category: input.category.trim() });
    revalidate();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Could not update expense." };
  }
}

export async function deleteExpenseAction(id: string): Promise<ExpenseActionResult> {
  try {
    await deleteExpense(id);
    revalidate();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Could not delete expense." };
  }
}
