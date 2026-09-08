"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Task, TaskInput, TaskStatus } from "@/lib/domain";
import { Card, Button, Input, Textarea, Select, Field } from "@/components/ui";

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "completed", label: "Done" },
];

type TaskFormProps = {
  open: boolean;
  initial?: Task | null;
  initialDate?: string;
  milestoneTitle?: string;
  pending: boolean;
  error?: string | null;
  onSubmit: (fields: Omit<TaskInput, "projectId" | "milestoneId">) => void;
  onClose: () => void;
};

export function TaskForm(props: TaskFormProps) {
  if (!props.open) return null;
  return <TaskFormFields key={props.initial?.id ?? "new"} {...props} />;
}

function TaskFormFields({ initial, initialDate, milestoneTitle, pending, error, onSubmit, onClose }: TaskFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(initial?.status ?? "todo");
  const [sourceLabel, setSourceLabel] = useState(initial?.source?.label ?? "");

  const [scheduledDate, setScheduledDate] = useState(initial?.scheduledDate ?? initialDate ?? "");
  const [scheduledTime, setScheduledTime] = useState(initial?.scheduledTime ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      description,
      status,
      scheduledDate: scheduledDate || undefined,
      scheduledTime: scheduledDate ? scheduledTime || undefined : undefined,
      source: sourceLabel.trim() ? { ...initial?.source, label: sourceLabel.trim(), type: initial?.source?.type ?? "manual" } : undefined,
    });
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="Source">
              <Input value={sourceLabel} onChange={(e) => setSourceLabel(e.target.value)} placeholder="Optional note or meeting" />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Scheduled date">
              <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
            </Field>
            <Field label="Time (optional)">
              <Input type="time" value={scheduledTime} disabled={!scheduledDate} onChange={(e) => setScheduledTime(e.target.value)} />
            </Field>
          </div>
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{scheduledDate ? "Uses your local date and time. No time means all day." : "Leave the date empty to keep this task unscheduled."}</span>
            {scheduledDate && <Button type="button" variant="ghost" onClick={() => { setScheduledDate(""); setScheduledTime(""); }}>Clear schedule</Button>}
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
