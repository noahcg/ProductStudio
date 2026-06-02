"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  RoadmapItem,
  RoadmapInput,
  RoadmapColumn,
  RoadmapPriority,
  RoadmapStatus,
  Effort,
} from "@/lib/domain";
import { Card, Button, Input, Textarea, Select, Field } from "@/components/ui";

const COLUMN_LABELS: Record<RoadmapColumn, string> = { now: "Now", next: "Next", later: "Later" };
const PRIORITIES: RoadmapPriority[] = ["High", "Medium", "Low"];
const STATUSES: { value: RoadmapStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
];
const EFFORTS: { value: Effort; label: string }[] = [
  { value: "S", label: "Small" },
  { value: "M", label: "Medium" },
  { value: "L", label: "Large" },
];

export function RoadmapForm({
  open,
  initial,
  defaultColumn = "now",
  projects,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: RoadmapItem | null;
  defaultColumn?: RoadmapColumn;
  projects: { id: string; name: string }[];
  pending: boolean;
  error?: string | null;
  onSubmit: (input: RoadmapInput) => void;
  onClose: () => void;
}) {
  const [projectId, setProjectId] = useState(initial?.projectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [column, setColumn] = useState<RoadmapColumn>(initial?.column ?? defaultColumn);
  const [priority, setPriority] = useState<RoadmapPriority>(initial?.priority ?? "Medium");
  const [status, setStatus] = useState<RoadmapStatus>(initial?.status ?? "planned");
  const [effort, setEffort] = useState<Effort>(initial?.effort ?? "M");
  const [targetDate, setTargetDate] = useState(initial?.targetDate?.slice(0, 10) ?? "");

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      projectId,
      title,
      description,
      column,
      priority,
      status,
      effort,
      targetDate: targetDate || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Card className="my-4 w-full max-w-2xl p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">
            {initial ? "Edit roadmap item" : "New roadmap item"}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Project">
              <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Column">
              <Select value={column} onChange={(e) => setColumn(e.target.value as RoadmapColumn)}>
                {(["now", "next", "later"] as RoadmapColumn[]).map((c) => (
                  <option key={c} value={c}>
                    {COLUMN_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to happen?"
              autoFocus
            />
          </Field>

          <Field label="Description">
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional detail / scope"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Priority">
              <Select value={priority} onChange={(e) => setPriority(e.target.value as RoadmapPriority)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as RoadmapStatus)}>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Effort">
              <Select value={effort} onChange={(e) => setEffort(e.target.value as Effort)}>
                {EFFORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Target date">
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : initial ? "Save changes" : "Create item"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
