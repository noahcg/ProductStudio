"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Project, Task } from "@/lib/domain";
import { Button, Card, Select } from "@/components/ui";
import { dateKey } from "@/lib/tasks/schedule";
import { cn } from "@/lib/utils";

export function TaskCalendar({ tasks, projects, projectId, onEdit, onAdd }: {
  tasks: Task[];
  projects: Project[];
  projectId: string;
  onEdit: (task: Task) => void;
  onAdd: (date: string) => void;
}) {
  const [today] = useState(() => dateKey(new Date()));
  const [selected, setSelected] = useState(today);
  const [month, setMonth] = useState(() => new Date(`${today.slice(0, 7)}-01T12:00:00`));
  const [scope, setScope] = useState("project");
  const visible = tasks.filter((task) => scope === "all" || task.projectId === projectId);
  const scheduled = visible.filter((task) => task.scheduledDate);
  const unscheduled = visible.filter((task) => !task.scheduledDate && task.status !== "completed");
  const selectedTasks = scheduled.filter((task) => task.scheduledDate === selected)
    .sort((a, b) => (a.scheduledTime ?? "").localeCompare(b.scheduledTime ?? "") || a.title.localeCompare(b.title));
  const start = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay(), 12);
  const cells = Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12));

  function moveMonth(offset: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + offset, 1, 12);
    setMonth(next);
    setSelected(dateKey(next));
  }

  return (
    <Card className="min-w-0 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-semibold text-fg"><CalendarDays className="h-4 w-4 text-accent" /> Task calendar</h3>
        <Select aria-label="Calendar projects" value={scope} onChange={(e) => setScope(e.target.value)} className="w-auto">
          <option value="project">This project</option>
          <option value="all">All projects</option>
        </Select>
      </div>
      <div className="my-4 flex flex-wrap items-center justify-between gap-2">
        <h4 aria-live="polite" className="text-sm font-semibold text-fg">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" aria-label="Previous month" onClick={() => moveMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" onClick={() => { const now = dateKey(new Date()); setSelected(now); setMonth(new Date(`${now.slice(0, 7)}-01T12:00:00`)); }}>Today</Button>
          <Button variant="ghost" aria-label="Next month" onClick={() => moveMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-muted">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="pb-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date) => {
          const key = dateKey(date);
          const dayTasks = scheduled.filter((task) => task.scheduledDate === key);
          return (
            <button key={key} type="button" aria-pressed={selected === key}
              aria-label={`${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}, ${dayTasks.length} tasks`}
              onClick={() => { setSelected(key); if (date.getMonth() !== month.getMonth()) setMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12)); }}
              className={cn("min-h-16 min-w-0 rounded-lg border p-1 text-left transition-colors sm:min-h-20 sm:p-2 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent", selected === key ? "border-accent bg-accent/10" : "border-line", date.getMonth() !== month.getMonth() ? "text-faint" : "text-fg")}>
              <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-xs", key === today && "bg-accent text-accent-fg")}>{date.getDate()}</span>
              {dayTasks.slice(0, 2).map((task) => <span key={task.id} className={cn("mt-1 hidden truncate rounded bg-surface-2 px-1 text-[10px] sm:block", task.status === "completed" ? "text-muted line-through" : "text-fg")}>{task.scheduledTime ? `${task.scheduledTime} ` : ""}{task.title}</span>)}
              {dayTasks.length > 0 && <span className="mt-1 block text-[10px] text-accent sm:hidden">{dayTasks.length} task{dayTasks.length === 1 ? "" : "s"}</span>}
              {dayTasks.length > 2 && <span className="hidden text-[10px] text-muted sm:block">+{dayTasks.length - 2} more</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-5 border-t border-line pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-fg">{new Date(`${selected}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</h4>
          <Button variant="subtle" className="text-xs" onClick={() => onAdd(selected)}><Plus className="h-3 w-3" /> Add task</Button>
        </div>
        {selectedTasks.length === 0 ? <p className="text-sm text-muted">No tasks scheduled for this day.</p> : <ul className="space-y-2">{selectedTasks.map((task) => (
          <li key={task.id}><button type="button" onClick={() => onEdit(task)} className="flex w-full items-start gap-3 rounded-lg bg-surface-2 p-3 text-left hover:bg-line">
            <span className="w-12 shrink-0 text-xs text-muted">{task.scheduledTime ?? "All day"}</span>
            <span className="min-w-0"><span className={cn("block break-words text-sm text-fg", task.status === "completed" && "line-through text-muted")}>{task.title}</span>
              <span className="text-xs text-muted">{scope === "all" ? `${projects.find((p) => p.id === task.projectId)?.name ?? "Project"} · ` : ""}{task.status === "completed" ? "Done" : task.status === "in_progress" ? "In progress" : "To do"}</span>
            </span>
          </button></li>
        ))}</ul>}
      </div>
      {unscheduled.length > 0 && <details className="mt-4 border-t border-line pt-4 text-sm">
        <summary className="cursor-pointer text-muted">Unscheduled · {unscheduled.length}</summary>
        <ul className="mt-2 space-y-1">{unscheduled.map((task) => <li key={task.id}><button type="button" onClick={() => onEdit(task)} className="w-full rounded-lg px-2 py-2 text-left text-fg hover:bg-surface-2">{task.title}<span className="ml-2 text-xs text-muted">Schedule →</span></button></li>)}</ul>
      </details>}
    </Card>
  );
}
