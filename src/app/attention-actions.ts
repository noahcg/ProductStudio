"use server";

import { revalidatePath } from "next/cache";
import { dismissAttentionItems } from "@/lib/data";

export async function dismissAttentionAction(ids: string[]): Promise<{ ok: true } | { ok: false }> {
  const validIds = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  if (!validIds.length) return { ok: true };
  try {
    await dismissAttentionItems(validIds);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
