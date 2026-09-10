import { getFocus } from "@/lib/data";
import { CurrentFocusView } from "./current-focus-view";

export async function CurrentFocus({
  name,
  stats,
}: {
  name: string;
  stats: { active: number; needsAttention: number; monthlySpend: string };
}) {
  return <CurrentFocusView focus={await getFocus()} initialNow={new Date().toISOString()} name={name} stats={stats} />;
}
