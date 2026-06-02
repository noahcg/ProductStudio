import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}
