"use client";

import { useOptimistic, useState, useTransition } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type {
  RoadmapItem,
  RoadmapInput,
  RoadmapColumn,
  RoadmapPriority,
  RoadmapStatus,
  Product,
  Project,
} from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Card, Badge, PageHeading, Button, Select } from "@/components/ui";
import { projectIcons, accentStyles } from "@/components/icons";
import { COLUMNS, inColumn, moveItem, reorderItem } from "./roadmap-ops";
import { RoadmapForm } from "./roadmap-form";
import {
  createRoadmapAction,
  updateRoadmapAction,
  deleteRoadmapAction,
  moveRoadmapAction,
  reorderRoadmapAction,
} from "@/app/roadmaps/actions";

const COLUMN_META: Record<RoadmapColumn, { title: string; hint: string; dot: string }> = {
  now: { title: "Now", hint: "Shipping this cycle", dot: "bg-success" },
  next: { title: "Next", hint: "Up after Now", dot: "bg-info" },
  later: { title: "Later", hint: "Parked / future", dot: "bg-faint" },
};
const effortLabel: Record<string, string> = { S: "Small", M: "Medium", L: "Large" };
const statusLabel: Record<RoadmapStatus, string> = {
  planned: "Planned",
  in_progress: "In progress",
  done: "Done",
};
const priorityChip: Record<RoadmapPriority, string> = {
  High: "bg-warning/15 text-warning",
  Medium: "bg-surface-2 text-muted",
  Low: "bg-surface-2 text-faint",
};

type OptimisticAction =
  | { type: "add"; item: RoadmapItem }
  | { type: "update"; item: RoadmapItem }
  | { type: "remove"; id: string }
  | { type: "set"; items: RoadmapItem[] };

type Modal =
  | { mode: "closed" }
  | { mode: "new"; column: RoadmapColumn }
  | { mode: "edit"; item: RoadmapItem };

export function RoadmapsView({
  items,
  products,
  projects,
}: {
  items: RoadmapItem[];
  products: Product[];
  projects: Project[];
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [modal, setModal] = useState<Modal>({ mode: "closed" });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [optimistic, applyOptimistic] = useOptimistic(
    items,
    (state: RoadmapItem[], action: OptimisticAction) => {
      switch (action.type) {
        case "add":
          return [...state, action.item];
        case "update":
          return state.map((i) => (i.id === action.item.id ? action.item : i));
        case "remove":
          return state.filter((i) => i.id !== action.id);
        case "set":
          return action.items;
      }
    }
  );

  const projectMeta = (id?: string) => projects.find((p) => p.id === id);
  const filtered = optimistic.filter((item) => item.productId === productId);

  function close() {
    setModal({ mode: "closed" });
    setError(null);
  }

  function submit(input: RoadmapInput) {
    setError(null);
    const editing = modal.mode === "edit" ? modal.item : null;
    startTransition(async () => {
      if (editing) {
        applyOptimistic({ type: "update", item: { ...editing, ...input } });
        const res = await updateRoadmapAction(editing.id, input);
        if (!res.ok) return setError(res.error);
      } else {
        const nextOrder = optimistic.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1;
        applyOptimistic({
          type: "add",
          item: { id: `optimistic-${Date.now()}`, sortOrder: nextOrder, ...input },
        });
        const res = await createRoadmapAction(input);
        if (!res.ok) return setError(res.error);
      }
      close();
    });
  }

  function remove(item: RoadmapItem) {
    if (!confirm(`Delete “${item.title}”?`)) return;
    startTransition(async () => {
      applyOptimistic({ type: "remove", id: item.id });
      const res = await deleteRoadmapAction(item.id);
      if (!res.ok) setError(res.error);
    });
  }

  function move(item: RoadmapItem, column: RoadmapColumn) {
    startTransition(async () => {
      applyOptimistic({ type: "set", items: moveItem(optimistic, item.id, column).items });
      const res = await moveRoadmapAction(item.id, column);
      if (!res.ok) setError(res.error);
    });
  }

  function reorder(item: RoadmapItem, direction: "up" | "down") {
    startTransition(async () => {
      applyOptimistic({ type: "set", items: reorderItem(optimistic, item.id, direction).items });
      const res = await reorderRoadmapAction(item.id, direction);
      if (!res.ok) setError(res.error);
    });
  }

  const boardEmpty = filtered.length === 0;
  const productName = products.find((product) => product.id === productId)?.name;

  return (
    <section className="roadmap-workspace">
      <PageHeading
        title="Product roadmap"
        subtitle="Set the direction for a product, then link initiatives to delivery projects when work begins."
        right={
          <Button variant="primary" onClick={() => setModal({ mode: "new", column: "now" })}>
            <Plus className="h-4 w-4" /> New initiative
          </Button>
        }
      />

      <div className="roadmap-toolbar mb-8">
        <label className="block w-full sm:w-72">
          <span className="mb-2 block text-sm font-medium text-muted">Viewing roadmap for</span>
          <Select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="roadmap-select text-base font-medium"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
        </label>
      </div>

      {boardEmpty ? (
        <Card className="roadmap-empty flex flex-col items-center justify-center gap-4 p-12 text-center">
          <p className="text-base text-muted">
            {items.length === 0
              ? "No initiatives yet. Set the first direction for this product."
              : `No initiatives for ${productName} yet.`}
          </p>
          <Button variant="primary" onClick={() => setModal({ mode: "new", column: "now" })}>
            <Plus className="h-4 w-4" /> New initiative
          </Button>
        </Card>
      ) : (
        <div className="roadmap-board grid grid-cols-1 gap-5 lg:grid-cols-3">
          {COLUMNS.map((col, colIdx) => {
            const colItems = inColumn(filtered, col);
            const meta = COLUMN_META[col];
            return (
              <div key={col} className="roadmap-lane flex flex-col">
                <div className="roadmap-column-heading mb-3 flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                  <h2 className="text-sm font-bold uppercase tracking-wide text-fg">{meta.title}</h2>
                  <span className="text-sm text-muted">{meta.hint}</span>
                  <span className="roadmap-count ml-auto text-sm font-semibold text-muted">{colItems.length}</span>
                </div>

                <div className="flex flex-col gap-3">
                  {colItems.map((item, i) => (
                    <RoadmapCard
                      key={item.id}
                      item={item}
                      project={projectMeta(item.projectId)}
                      canLeft={colIdx > 0}
                      canRight={colIdx < COLUMNS.length - 1}
                      canUp={i > 0}
                      canDown={i < colItems.length - 1}
                      onEdit={() => setModal({ mode: "edit", item })}
                      onDelete={() => remove(item)}
                      onMove={(c) => move(item, c)}
                      onReorder={(d) => reorder(item, d)}
                      colIdx={colIdx}
                    />
                  ))}
                  {colItems.length === 0 && (
                    <div className="roadmap-column-empty rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
                      No initiatives in this lane
                    </div>
                  )}
                  <button
                    onClick={() => setModal({ mode: "new", column: col })}
                    className="roadmap-add flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line py-2.5 text-sm font-medium text-muted transition-colors hover:border-accent/60 hover:text-fg"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add initiative
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-danger">{error}</p>}

      <RoadmapForm
        key={modal.mode === "edit" ? modal.item.id : `${modal.mode}-${productId}-${modal.mode === "new" ? modal.column : ""}`}
        open={modal.mode !== "closed"}
        initial={modal.mode === "edit" ? modal.item : null}
        defaultProductId={productId}
        defaultColumn={modal.mode === "new" ? modal.column : "now"}
        products={products}
        projects={projects.map((p) => ({ id: p.id, name: p.name, productId: p.productId }))}
        pending={pending}
        error={error}
        onSubmit={submit}
        onClose={close}
      />
    </section>
  );
}

function RoadmapCard({
  item,
  project,
  canLeft,
  canRight,
  canUp,
  canDown,
  colIdx,
  onEdit,
  onDelete,
  onMove,
  onReorder,
}: {
  item: RoadmapItem;
  project?: Pick<Project, "id" | "name" | "icon" | "accent">;
  canLeft: boolean;
  canRight: boolean;
  canUp: boolean;
  canDown: boolean;
  colIdx: number;
  onEdit: () => void;
  onDelete: () => void;
  onMove: (column: RoadmapColumn) => void;
  onReorder: (direction: "up" | "down") => void;
}) {
  const Icon = project ? projectIcons[project.icon] : null;
  const accent = project ? accentStyles[project.accent] : null;

  const ctrl =
    "grid h-6 w-6 place-items-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-faint";

  return (
    <Card className="group p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {Icon && accent && (
            <span className={cn("grid h-7 w-7 place-items-center rounded-lg ring-1", `bg-surface-2 ${accent.ring}`)}>
              <Icon className="h-3.5 w-3.5 text-fg" />
            </span>
          )}
          <span className="text-xs text-muted">{project ? `Delivery: ${project.name}` : "Not linked to delivery"}</span>
        </div>
        <div className="flex items-center gap-1">
          {item.tag === "milestone" && <Badge tone="violet">Milestone</Badge>}
          <button aria-label="Edit" onClick={onEdit} className={cn(ctrl, "opacity-0 group-hover:opacity-100")}>
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            aria-label="Delete"
            onClick={onDelete}
            className={cn(ctrl, "opacity-0 hover:text-danger group-hover:opacity-100")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-[15px] font-semibold text-fg">{item.title}</h3>
      {item.description && <p className="mt-1 text-xs text-muted">{item.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        <span className={cn("rounded-md px-2 py-0.5 font-medium", priorityChip[item.priority])}>
          {item.priority}
        </span>
        <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-muted">
          {effortLabel[item.effort]}
        </span>
        <span className="text-faint">{statusLabel[item.status]}</span>
        {item.targetDate && (
          <span className="text-faint">
            · {new Date(item.targetDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Move / reorder controls */}
      <div className="mt-3 flex items-center gap-1 border-t border-line pt-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          aria-label="Move left"
          disabled={!canLeft}
          onClick={() => onMove(COLUMNS[colIdx - 1])}
          className={ctrl}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          aria-label="Move right"
          disabled={!canRight}
          onClick={() => onMove(COLUMNS[colIdx + 1])}
          className={ctrl}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="mx-1 h-4 w-px bg-line" />
        <button aria-label="Move up" disabled={!canUp} onClick={() => onReorder("up")} className={ctrl}>
          <ChevronUp className="h-4 w-4" />
        </button>
        <button aria-label="Move down" disabled={!canDown} onClick={() => onReorder("down")} className={ctrl}>
          <ChevronDown className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}
