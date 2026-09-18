"use client";

import { useState, useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Project, Task } from "@/lib/domain";
import type { Appointment, AppointmentInput } from "@/lib/domain/appointment";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { dateKey } from "@/lib/tasks/schedule";
import { cn } from "@/lib/utils";
import { saveAppointmentAction, deleteAppointmentAction, scheduleTaskAction } from "@/app/projects/calendar-actions";

type Editor = { kind: "task"; task?: Task; date: string; time?: string } | { kind: "meeting"; appointment?: Appointment; date: string; time?: string };
const localDate = (date: string) => new Date(`${date}T12:00:00`);
const dayLabel = (date: string) => localDate(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

export function TaskCalendar({ tasks, appointments, projects, projectId, onAdd }: {
  tasks: Task[]; appointments: Appointment[]; projects: Project[]; projectId: string; onAdd: (date: string) => void;
}) {
  const [today] = useState(() => dateKey(new Date()));
  const [selected, setSelected] = useState(today);
  const [scope, setScope] = useState("project");
  const [editor, setEditor] = useState<Editor | null>(null);
  const visibleTasks = tasks.filter((task) => scope === "all" || task.projectId === projectId);
  const visibleMeetings = appointments.filter((appointment) => scope === "all" || appointment.projectId === projectId);
  const anchor = localDate(selected);
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
  start.setDate(start.getDate() - start.getDay());
  const dates = Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12));
  const entries = [
    ...visibleTasks.filter((task) => task.scheduledDate === selected).map((task) => ({ id: task.id, kind: "task" as const, title: task.title, time: task.scheduledTime || "", detail: task.status === "completed" ? "Done" : "Task", projectId: task.projectId, task })),
    ...visibleMeetings.filter((meeting) => meeting.date === selected).map((meeting) => ({ id: meeting.id, kind: "meeting" as const, title: meeting.title, time: meeting.startTime, detail: `${meeting.clientName} · until ${meeting.endTime}`, projectId: meeting.projectId, meeting })),
  ].sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title));
  function select(date: string) { setSelected(date); setEditor(null); }

  return <Card className="min-w-0 p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-accent" />Calendar</h3>
      <Select aria-label="Calendar projects" value={scope} onChange={(event) => { setScope(event.target.value); setEditor(null); }} className="w-auto border-transparent bg-transparent py-1 text-xs"><option value="project">This project</option><option value="all">All projects</option></Select>
    </div>
    <div className="mb-3 mt-4 flex items-center justify-between gap-2">
      <h4 className="text-sm font-medium" aria-live="polite">{anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4>
      <div className="flex items-center gap-0.5">
        <Button variant="ghost" className="text-xs" onClick={() => select(today)}>Today</Button>
        <Button variant="ghost" aria-label="Previous month" onClick={() => select(dateKey(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1, 12)))}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="ghost" aria-label="Next month" onClick={() => select(dateKey(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1, 12)))}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center">
      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span key={day} className="pb-1 text-[11px] text-faint">{day}</span>)}
      {dates.map((date) => {
        const key = dateKey(date);
        const taskCount = visibleTasks.filter((task) => task.scheduledDate === key).length;
        const meetingCount = visibleMeetings.filter((meeting) => meeting.date === key).length;
        return <button key={key} type="button" aria-label={`${dayLabel(key)}, ${taskCount} tasks, ${meetingCount} meetings`} aria-pressed={selected === key} aria-current={key === today ? "date" : undefined} onClick={() => select(key)} className={cn("flex h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg text-xs transition-colors focus-visible:outline-2 focus-visible:outline-accent", selected === key ? "bg-accent text-accent-fg" : "hover:bg-surface-2", selected !== key && (key === today ? "font-semibold text-accent" : date.getMonth() !== anchor.getMonth() ? "text-faint" : "text-fg"))}>
          <span>{date.getDate()}</span>
          <span aria-hidden="true" className="flex h-1 items-center gap-1">{taskCount > 0 && <span className={cn("h-1 w-1 rounded-full", selected === key ? "bg-white" : "bg-accent")} />}{meetingCount > 0 && <span className={cn("h-1 w-1 rounded-full", selected === key ? "bg-white/60" : "bg-info")} />}</span>
        </button>;
      })}
    </div>
    <div className="mt-4 border-t border-line pt-4">
      {editor ? <CalendarEditor key={`${editor.kind}-${editor.kind === "task" ? editor.task?.id : editor.appointment?.id}-${editor.date}`} editor={editor} tasks={visibleTasks} projects={projects} projectId={projectId} onClose={() => setEditor(null)} onAdd={onAdd} /> : <>
        <h4 className="mb-3 text-xs font-medium text-muted">{dayLabel(selected)}</h4>
        {entries.length === 0 ? <p className="py-1 text-sm text-faint">Nothing scheduled.</p> : <ul className="space-y-1">{entries.map((entry) => <li key={`${entry.kind}-${entry.id}`}>
          <button type="button" onClick={() => setEditor(entry.kind === "task" ? { kind: "task", task: entry.task, date: selected } : { kind: "meeting", appointment: entry.meeting, date: selected })} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-accent">
            <span className="w-12 shrink-0 pt-0.5 text-xs text-muted">{entry.time || "All day"}</span>
            <span className={cn("min-w-0 border-l-2 pl-3", entry.kind === "task" ? "border-accent/60" : "border-info/60")}><span className={cn("block break-words text-sm", entry.kind === "task" && entry.task.status === "completed" && "text-muted line-through")}>{entry.title}</span><span className="mt-0.5 block text-xs text-faint">{entry.detail}{scope === "all" && ` · ${projects.find((project) => project.id === entry.projectId)?.name || "Project"}`}</span></span>
          </button>
        </li>)}</ul>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="ghost" className="text-xs" onClick={() => setEditor({ kind: "task", date: selected })}><Plus className="h-3.5 w-3.5" /> Schedule task</Button>
          <Button variant="ghost" className="text-xs" onClick={() => setEditor({ kind: "meeting", date: selected })}><Plus className="h-3.5 w-3.5" /> Client meeting</Button>
        </div>
      </>}
    </div>
  </Card>;
}

function CalendarEditor({ editor, tasks, projects, projectId, onClose, onAdd }: { editor: Editor; tasks: Task[]; projects: Project[]; projectId: string; onClose: () => void; onAdd: (date: string) => void }) {
  const appointment = editor.kind === "meeting" ? editor.appointment : undefined;
  const [taskId, setTaskId] = useState(editor.kind === "task" ? editor.task?.id ?? "" : "");
  const [date, setDate] = useState(editor.date);
  const [time, setTime] = useState(editor.kind === "task" ? editor.task?.scheduledTime ?? "" : appointment?.startTime ?? editor.time ?? "09:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const task = tasks.find((task) => task.id === taskId);
  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => { try { const result = await action(); if (!result.ok) setError(result.error || "Could not save."); else onClose(); } catch { setError("Could not save. Please try again."); } });
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (editor.kind === "task") { run(() => scheduleTaskAction(taskId, date, time || undefined)); return; }
    const value = (name: string) => String(form.get(name) || "").trim();
    const input: AppointmentInput = { projectId: value("projectId"), title: value("title"), clientName: value("clientName"), clientEmail: value("clientEmail"), date, startTime: time, endTime: value("endTime"), location: value("location"), notes: value("notes") };
    run(() => saveAppointmentAction(appointment?.id ?? null, input));
  }
  return <form onSubmit={submit} className="space-y-4">
    <div className="flex items-center justify-between"><h4 className="text-sm font-semibold">{editor.kind === "task" ? "Schedule task" : appointment ? "Edit client meeting" : "New client meeting"}</h4><Button type="button" variant="ghost" onClick={onClose}>Cancel</Button></div>
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
      {editor.kind === "task" ? <div className="sm:col-span-2"><Field label="Task"><Select value={taskId} required onChange={(e) => setTaskId(e.target.value)}><option value="">Choose an existing task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</Select></Field><Button type="button" variant="link" className="mt-2 text-xs" onClick={() => onAdd(date)}>Create a new task</Button></div> : <>
        <Field label="Meeting title"><Input name="title" required defaultValue={appointment?.title} placeholder="Project check-in" /></Field>
        <Field label="Project"><Select name="projectId" defaultValue={appointment?.projectId ?? projectId}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></Field>
        <Field label="Client name"><Input name="clientName" required defaultValue={appointment?.clientName} /></Field>
        <Field label="Client email (optional)"><Input name="clientEmail" type="email" defaultValue={appointment?.clientEmail} /></Field>
      </>}
      <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={editor.kind === "task" ? "Time (blank for all day)" : "Start time"}><Input type="time" required={editor.kind === "meeting"} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      {editor.kind === "meeting" && <><Field label="End time"><Input name="endTime" type="time" required defaultValue={appointment?.endTime ?? (editor.time ? `${String(Math.min(23, Number(editor.time.slice(0, 2)) + 1)).padStart(2, "0")}:${editor.time.startsWith("23") ? "59" : "00"}` : "10:00")} /></Field><Field label="Location or call link"><Input name="location" defaultValue={appointment?.location} placeholder="Office or video link" /></Field><Field label="Notes" className="sm:col-span-2"><Textarea name="notes" rows={2} defaultValue={appointment?.notes} /></Field></>}
    </fieldset>
    {task && <p className="whitespace-pre-wrap text-sm text-muted">{task.description || "No description added."}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>{editor.kind === "meeting" ? <p className="text-xs text-muted">Saved to Product Studio. No invitation is sent.</p> : task?.scheduledDate && <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => scheduleTaskAction(task.id))}>Remove from calendar</Button>}</div>
      <div className="flex gap-2">{appointment && <Button type="button" variant="ghost" className="text-danger" disabled={pending} onClick={() => { if (confirm(`Delete “${appointment.title}”?`)) run(() => deleteAppointmentAction(appointment.id)); }}>Delete meeting</Button>}<Button type="submit" variant="primary" disabled={pending || (editor.kind === "task" && !taskId)}>{pending ? "Saving…" : editor.kind === "task" ? "Save schedule" : "Save meeting"}</Button></div>
    </div>
  </form>;
}
