"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Task, TaskInput, TaskStatus, TaskPriority } from "@/lib/domain";
import { Card, Button, Input, Textarea, Select, Field } from "@/components/ui";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high", "critical"];

export function TaskForm({
  open,
  initial,
  milestoneTitle,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: Task | null;
  milestoneTitle?: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (fields: Omit<TaskInput, "projectId" | "milestoneId">) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [priority, setPriority] = useState<TaskPriority>(initial?.priority ?? "medium");
  const [targetDate, setTargetDate] = useState(initial?.targetDate?.slice(0, 10) ?? "");

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ title, description, status, priority, targetDate: targetDate || undefined });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="my-4 w-full max-w-lg p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{initial ? "Edit task" : "New task"}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {milestoneTitle && <p className="mb-5 text-xs text-muted">{milestoneTitle}</p>}

        <form onSubmit={submit} className="space-y-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What work remains?" autoFocus />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional detail" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p[0].toUpperCase() + p.slice(1)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Target date">
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : initial ? "Save changes" : "Add task"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
