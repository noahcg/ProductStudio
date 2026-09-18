"use client";

import type { Task } from "@/lib/domain";
import { Button } from "@/components/ui";

export function TaskDetails({ task, onEdit }: { task: Task; onEdit: () => void }) {
  return <section className="mt-4 border-t border-line pt-4" aria-label="Selected task details">
    <div className="flex items-start justify-between gap-4">
      <h4 className="text-sm font-medium text-fg">{task.title}</h4>
      <Button variant="link" className="shrink-0 text-xs" onClick={onEdit}>Edit task</Button>
    </div>
    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{task.description || "No description added."}</p>
    {task.source?.label && <p className="mt-3 text-xs text-faint">Source: {task.source.label}</p>}
  </section>;
}
