"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  CheckCircle2,
  CircleHelp,
  RotateCcw,
  Plus,
  Search,
  Pencil,
  Trash2,
} from "lucide-react";
import type { Decision, DecisionInput, DecisionStatus } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Card, Badge, PageHeading, Button, Input, Select } from "@/components/ui";
import { filterDecisions } from "./filter";
import { DecisionForm } from "./decision-form";
import {
  createDecisionAction,
  updateDecisionAction,
  deleteDecisionAction,
} from "@/app/decisions/actions";

const statusMeta: Record<
  DecisionStatus,
  { tone: "high" | "planning" | "content"; icon: typeof CheckCircle2; chip: string }
> = {
  Decided: { tone: "high", icon: CheckCircle2, chip: "bg-success/15 text-success" },
  Open: { tone: "planning", icon: CircleHelp, chip: "bg-info/15 text-info" },
  Revisit: { tone: "content", icon: RotateCcw, chip: "bg-warning/15 text-warning" },
};

type OptimisticAction =
  | { type: "add"; decision: Decision }
  | { type: "update"; decision: Decision }
  | { type: "remove"; id: string };

type Modal = { mode: "closed" } | { mode: "new" } | { mode: "edit"; decision: Decision };

export function DecisionsView({
  decisions,
  projects,
  initialModal,
}: {
  decisions: Decision[];
  projects: { id: string; name: string }[];
  initialModal?: "new" | null;
}) {
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [modal, setModal] = useState<Modal>(initialModal === "new" ? { mode: "new" } : { mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [optimistic, applyOptimistic] = useOptimistic(
    decisions,
    (state: Decision[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.decision];
        case "update":
          return state.map((d) => (d.id === action.decision.id ? action.decision : d));
        case "remove":
          return state.filter((d) => d.id !== action.id);
      }
    }
  );

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const filtered = filterDecisions(optimistic, { projectId: projectFilter, query });
  const openCount = optimistic.filter((d) => d.status !== "Decided").length;

  function close() {
    setModal({ mode: "closed" });
    setError(null);
  }

  function submit(input: DecisionInput) {
    setError(null);
    const editing = modal.mode === "edit" ? modal.decision : null;
    startTransition(async () => {
      if (editing) {
        applyOptimistic({ type: "update", decision: { ...editing, ...input } });
        const res = await updateDecisionAction(editing.id, input);
        if (!res.ok) return setError(res.error);
      } else {
        applyOptimistic({
          type: "add",
          decision: { id: `optimistic-${Date.now()}`, ...input },
        });
        const res = await createDecisionAction(input);
        if (!res.ok) return setError(res.error);
      }
      close();
    });
  }

  function remove(d: Decision) {
    if (!confirm(`Delete “${d.title}”? This can't be undone.`)) return;
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: d.id });
      const res = await deleteDecisionAction(d.id);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div>
      <PageHeading
        title="Decisions"
        subtitle="Product memory — the calls you've made, why, and what you traded off."
        right={
          <div className="flex items-center gap-2">
            <Badge tone="planning">{openCount} open</Badge>
            <Badge tone="high">{optimistic.length - openCount} decided</Badge>
            <Button variant="primary" onClick={() => setModal({ mode: "new" })} className="ml-1">
              <Plus className="h-4 w-4" /> New decision
            </Button>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search decisions, rationale, tags…"
            className="pl-9"
          />
        </div>
        <Select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          className="sm:w-56"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              projectName={projectName(d.projectId)}
              onEdit={() => setModal({ mode: "edit", decision: d })}
              onDelete={() => remove(d)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          total={optimistic.length}
          query={query}
          projectName={projectFilter !== "all" ? projectName(projectFilter) : undefined}
          onCreate={() => setModal({ mode: "new" })}
        />
      )}

      <DecisionForm
        open={modal.mode !== "closed"}
        initial={modal.mode === "edit" ? modal.decision : null}
        projects={projects}
        pending={pending}
        error={error}
        onSubmit={submit}
        onClose={close}
      />
    </div>
  );
}

function DecisionCard({
  decision: d,
  projectName,
  onEdit,
  onDelete,
}: {
  decision: Decision;
  projectName?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = statusMeta[d.status];
  const Icon = meta.icon;
  return (
    <Card className="group p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg", meta.chip)}>
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[15px] font-semibold leading-snug text-fg">{d.title}</h3>
            <div className="mt-0.5 text-xs text-muted">
              {projectName ?? "Studio"} ·{" "}
              {new Date(d.dateIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={meta.tone}>{d.status}</Badge>
          <button
            aria-label="Edit"
            onClick={onEdit}
            className="grid h-7 w-7 place-items-center rounded-md text-faint opacity-0 transition-colors hover:bg-surface-2 hover:text-fg group-hover:opacity-100"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Delete"
            onClick={onDelete}
            className="grid h-7 w-7 place-items-center rounded-md text-faint opacity-0 transition-colors hover:bg-surface-2 hover:text-danger group-hover:opacity-100"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {d.decision && (
        <p className="mt-3 border-l-2 border-accent/40 pl-3 text-sm font-medium text-fg">{d.decision}</p>
      )}
      <p className="mt-3 text-sm leading-relaxed text-muted">{d.rationale}</p>
      {d.tradeoffs && (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <span className="font-medium text-faint">Trade-offs: </span>
          {d.tradeoffs}
        </p>
      )}

      {d.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {d.tags.map((t) => (
            <span
              key={t}
              className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted ring-1 ring-inset ring-line"
            >
              #{t}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function EmptyState({
  total,
  query,
  projectName,
  onCreate,
}: {
  total: number;
  query: string;
  projectName?: string;
  onCreate: () => void;
}) {
  let message: string;
  let showCreate = true;
  if (total === 0) {
    message = "No decisions yet. Capture your first product decision.";
  } else if (query.trim()) {
    message = `No decisions match “${query.trim()}”.`;
    showCreate = false;
  } else if (projectName) {
    message = `No decisions for ${projectName} yet.`;
  } else {
    message = "No decisions to show.";
    showCreate = false;
  }

  return (
    <Card className="flex flex-col items-center justify-center gap-4 p-12 text-center">
      <p className="text-sm text-muted">{message}</p>
      {showCreate && (
        <Button variant="primary" onClick={onCreate}>
          <Plus className="h-4 w-4" /> New decision
        </Button>
      )}
    </Card>
  );
}
