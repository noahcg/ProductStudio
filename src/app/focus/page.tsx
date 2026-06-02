import { Suspense } from "react";
import { FocusBoard } from "@/components/focus/focus-board";

export default function FocusPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted">Loading focus…</div>}>
      <FocusBoard />
    </Suspense>
  );
}
