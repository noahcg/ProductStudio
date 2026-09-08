import { getFocus } from "@/lib/data";
import { CurrentFocusView } from "./current-focus-view";

export async function CurrentFocus() {
  return <CurrentFocusView focus={await getFocus()} initialNow={new Date().toISOString()} />;
}
