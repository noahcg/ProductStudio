"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  Project,
  ProjectAccent,
  ProjectIcon,
  ProjectInput,
  ProjectStatus,
} from "@/lib/domain";
import { Button, Card, Field, Input, Select } from "@/components/ui";

const STATUSES: ProjectStatus[] = ["Active", "Planning", "Content", "Paused", "Shipped"];
const ACCENTS: ProjectAccent[] = ["amber", "violet", "blue", "orange", "green", "teal"];
const ICONS: { value: ProjectIcon; label: string }[] = [
  { value: "chef", label: "Food / Home" },
  { value: "shirt", label: "Fashion / Closet" },
  { value: "dumbbell", label: "Fitness / Coaching" },
  { value: "sofa", label: "Lifestyle / Content" },
];

export function ProjectForm({
  open,
  initial,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: Project | null;
  pending: boolean;
  error?: string | null;
  onSubmit: (input: ProjectInput) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [tagline, setTagline] = useState(initial?.tagline ?? "");
  const [status, setStatus] = useState<ProjectStatus>(initial?.status ?? "Active");
  const [nextMilestone, setNextMilestone] = useState(initial?.nextMilestone ?? "");
  const [accent, setAccent] = useState<ProjectAccent>(initial?.accent ?? "blue");
  const [icon, setIcon] = useState<ProjectIcon>(initial?.icon ?? "dumbbell");
  const [repo, setRepo] = useState(initial?.repo ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");

  if (!open) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      tagline,
      status,
      nextMilestone,
      accent,
      icon,
      repo: repo || undefined,
      domain: domain || undefined,
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
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{initial ? "Edit project" : "New project"}</h2>
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
          <Field label="Project name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Client Portal" autoFocus />
          </Field>
          <Field label="Short label">
            <Input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Client operations" />
          </Field>
          <Field label="Current goal">
            <Input value={nextMilestone} onChange={(e) => setNextMilestone(e.target.value)} placeholder="Launch MVP" />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status">
              <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Accent">
              <Select value={accent} onChange={(e) => setAccent(e.target.value as ProjectAccent)}>
                {ACCENTS.map((a) => (
                  <option key={a} value={a}>{a[0].toUpperCase() + a.slice(1)}</option>
                ))}
              </Select>
            </Field>
            <Field label="Icon">
              <Select value={icon} onChange={(e) => setIcon(e.target.value as ProjectIcon)}>
                {ICONS.map((i) => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="GitHub repo">
              <Input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="owner/repo" />
            </Field>
            <Field label="Domain">
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="example.com" />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>
              {pending ? "Saving..." : initial ? "Save changes" : "Add project"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

