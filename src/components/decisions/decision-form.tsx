"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Decision, DecisionInput, DecisionStatus } from "@/lib/domain";
import { Card, Button, Input, Textarea, Select, Field } from "@/components/ui";

const STATUSES: DecisionStatus[] = ["Decided", "Open", "Revisit"];

function toDateInput(iso: string): string {
  // yyyy-mm-dd for <input type="date">
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function DecisionForm({
  open,
  initial,
  projects,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: Decision | null;
  projects: { id: string; name: string }[];
  pending: boolean;
  error?: string | null;
  onSubmit: (input: DecisionInput) => void;
  onClose: () => void;
}) {
  const [projectId, setProjectId] = useState(initial?.projectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [status, setStatus] = useState<DecisionStatus>(initial?.status ?? "Decided");
  const [dateStr, setDateStr] = useState(toDateInput(initial?.dateIso ?? ""));
  const [decision, setDecision] = useState(initial?.decision ?? "");
  const [rationale, setRationale] = useState(initial?.rationale ?? "");
  const [tradeoffs, setTradeoffs] = useState(initial?.tradeoffs ?? "");
  const [tagsStr, setTagsStr] = useState((initial?.tags ?? []).join(", "));

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      projectId: projectId || undefined,
      title,
      status,
      dateIso: new Date(dateStr).toISOString(),
      decision,
      rationale,
      tradeoffs,
      tags: tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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
            {initial ? "Edit decision" : "New decision"}
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
                <option value="">Studio (no project)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as DecisionStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Title">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short name for the decision"
              autoFocus
            />
          </Field>

          <Field label="Decision (the call you made)">
            <Textarea
              rows={2}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="What did you decide? (optional for open decisions)"
            />
          </Field>

          <Field label="Rationale">
            <Textarea
              rows={3}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why this call?"
            />
          </Field>

          <Field label="Trade-offs">
            <Textarea
              rows={2}
              value={tradeoffs}
              onChange={(e) => setTradeoffs(e.target.value)}
              placeholder="What are you giving up?"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Tags (comma-separated)">
              <Input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="pricing, gtm"
              />
            </Field>
            <Field label="Decided on">
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving…" : initial ? "Save changes" : "Create decision"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
