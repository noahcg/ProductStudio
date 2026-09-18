"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import type { Project, Task } from "@/lib/domain";
import type { Appointment, AppointmentInput } from "@/lib/domain/appointment";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { dateKey } from "@/lib/tasks/schedule";
import { cn } from "@/lib/utils";
import { saveAppointmentAction, deleteAppointmentAction, scheduleTaskAction } from "@/app/projects/calendar-actions";

type Editor = { kind: "task"; task?: Task; date: string; time?: string } | { kind: "meeting"; appointment?: Appointment; date: string; time?: string };
const localDate = (date: string) => new Date(`${date}T12:00:00`);
const dayLabel = (date: string) => localDate(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

export function TaskCalendar({ tasks, appointments, projects, projectId, onAdd }: {
  tasks: Task[]; appointments: Appointment[]; projects: Project[]; projectId: string; onAdd: (date: string) => void;
}) {
  const [today] = useState(() => dateKey(new Date()));
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<"month" | "week">("month");
  const weekScroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (view === "week" && weekScroll.current) weekScroll.current.scrollTop = 8 * 56; }, [view]);
  const [scope, setScope] = useState("project");
  const [editor, setEditor] = useState<Editor | null>(null);
  const visibleTasks = tasks.filter((task) => scope === "all" || task.projectId === projectId);
  const visibleMeetings = appointments.filter((appointment) => scope === "all" || appointment.projectId === projectId);
  const anchor = localDate(selected);
  const minuteOfDay = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  const start = view === "month" ? new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12) : localDate(selected);
  start.setDate(start.getDate() - start.getDay());
  const dates = Array.from({ length: view === "month" ? 42 : 7 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index, 12));
  const selectedTasks = visibleTasks.filter((task) => task.scheduledDate === selected);
  const selectedMeetings = visibleMeetings.filter((appointment) => appointment.date === selected);
  function move(offset: number) {
    const next = view === "month" ? new Date(anchor.getFullYear(), anchor.getMonth() + offset, 1, 12) : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + offset * 7, 12);
    setSelected(dateKey(next)); setEditor(null);
  }
  function select(date: string) { setSelected(date); setEditor(null); }
  function taskButton(task: Task) {
    return <button key={task.id} type="button" title={task.title} onClick={() => { setSelected(task.scheduledDate || selected); setEditor({ kind: "task", task, date: task.scheduledDate || selected }); }} className={cn("block w-full truncate rounded border-l-2 border-accent bg-accent/10 px-2 py-1 text-left text-xs text-fg hover:bg-accent/20", task.status === "completed" && "text-muted line-through")}>
      {task.scheduledTime && <span className="mr-1 text-muted">{task.scheduledTime}</span>}{task.title}
    </button>;
  }
  function meetingButton(appointment: Appointment) {
    return <button key={appointment.id} type="button" title={`${appointment.title} · ${appointment.clientName}`} onClick={() => { setSelected(appointment.date); setEditor({ kind: "meeting", appointment, date: appointment.date }); }} className="block w-full truncate rounded border-l-2 border-info bg-info/10 px-2 py-1 text-left text-xs text-fg hover:bg-info/20"><span className="mr-1 text-muted">{appointment.startTime}</span>{appointment.title}</button>;
  }
  return <Card className="overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="flex items-center gap-3"><CalendarDays className="h-5 w-5 text-muted" /><h3 className="text-lg font-semibold">Calendar</h3><Select aria-label="Calendar projects" value={scope} onChange={(e) => { setScope(e.target.value); setEditor(null); }} className="w-auto"><option value="project">This project</option><option value="all">All projects</option></Select></div>
      <div className="flex gap-2"><Button onClick={() => setEditor({ kind: "task", date: selected })}><Plus className="h-4 w-4" /> Schedule task</Button><Button variant="primary" onClick={() => setEditor({ kind: "meeting", date: selected })}><Plus className="h-4 w-4" /> Client meeting</Button></div>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <div className="flex items-center gap-2"><Button variant="subtle" onClick={() => select(today)}>Today</Button><Button variant="ghost" aria-label="Previous period" onClick={() => move(-1)}><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" aria-label="Next period" onClick={() => move(1)}><ChevronRight className="h-4 w-4" /></Button><h4 className="ml-2 text-sm font-semibold" aria-live="polite">{anchor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</h4></div>
      <div className="flex rounded-lg bg-surface-2 p-1">{(["month", "week"] as const).map((mode) => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => setView(mode)} className={cn("rounded-md px-3 py-1 text-xs capitalize", view === mode ? "bg-surface text-fg shadow-sm" : "text-muted")}>{mode}</button>)}</div>
    </div>
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className={cn("grid grid-cols-7 border-t border-line bg-surface-2/40", view === "week" && "hidden")}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="border-r border-line px-3 py-2 text-xs text-muted last:border-r-0">{day}</div>)}</div>
        {view === "month" ? <div className="grid grid-cols-7">{dates.map((date) => {
          const key = dateKey(date);
          const dayTasks = visibleTasks.filter((task) => task.scheduledDate === key).sort((a, b) => (a.scheduledTime || "").localeCompare(b.scheduledTime || ""));
          const meetings = visibleMeetings.filter((appointment) => appointment.date === key).sort((a, b) => a.startTime.localeCompare(b.startTime));
          return <div key={key} className={cn("min-w-0 border-r border-t border-line p-2", "min-h-28", selected === key && "bg-accent/5", date.getMonth() !== anchor.getMonth() && view === "month" && "bg-surface-2/30")}>
            <button type="button" aria-label={dayLabel(key)} aria-pressed={selected === key} onClick={() => select(key)} className="mb-2 flex w-full items-center justify-between rounded text-left focus-visible:outline-2 focus-visible:outline-accent"><span className={cn("grid h-6 w-6 place-items-center rounded-full text-xs", key === today ? "bg-accent text-white" : selected === key ? "bg-accent/15 text-accent" : "text-muted")}>{date.getDate()}</span><span className="text-xs text-faint">{dayTasks.length + meetings.length || ""}</span></button>
            <div className={cn("space-y-1 overflow-y-auto", "max-h-28")}>{dayTasks.map(taskButton)}{meetings.map(meetingButton)}</div>
          </div>;
        })}</div> : <>
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-t border-line">
            <div className="p-1 pt-3 text-[10px] text-muted">All day</div>
            {dates.map((date) => { const key = dateKey(date); return <div key={key} className="min-h-20 space-y-1 border-l border-line p-1">
              <button type="button" className={cn("mb-1 block w-full rounded py-1 text-xs", selected === key ? "bg-accent/10 text-accent" : "text-muted")} onClick={() => select(key)}>{date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })}</button>
              {visibleTasks.filter((task) => task.scheduledDate === key && !task.scheduledTime).map(taskButton)}
            </div>; })}
          </div>
          <div ref={weekScroll} className="max-h-[560px] overflow-y-auto border-t border-line">
            <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))]">
              <div>{Array.from({ length: 24 }, (_, hour) => <div key={hour} className="h-14 pr-1 pt-1 text-right text-[10px] text-muted">{String(hour).padStart(2, "0")}:00</div>)}</div>
              {dates.map((date) => { const key = dateKey(date); return <div key={key} className="relative border-l border-line">
                {Array.from({ length: 24 }, (_, hour) => <button key={hour} type="button" aria-label={`Schedule on ${dayLabel(key)} at ${hour}:00`} onClick={() => { setSelected(key); setEditor({ kind: "meeting", date: key, time: `${String(hour).padStart(2, "0")}:00` }); }} className="block h-14 w-full border-b border-line/60 hover:bg-accent/5 focus-visible:bg-accent/10" />)}
                {visibleTasks.filter((task) => task.scheduledDate === key && task.scheduledTime).map((task) => <div key={task.id} className="absolute left-1 right-1 z-10" style={{ top: minuteOfDay(task.scheduledTime!) * 56 / 60 }}>{taskButton(task)}</div>)}
                {visibleMeetings.filter((meeting) => meeting.date === key).map((meeting) => <button key={meeting.id} type="button" onClick={() => { setSelected(key); setEditor({ kind: "meeting", appointment: meeting, date: key }); }} className="absolute left-1 right-1 z-10 overflow-y-auto rounded border-l-2 border-info bg-surface-2 p-1 text-left text-xs text-fg ring-1 ring-info/30 hover:bg-info/10" style={{ top: minuteOfDay(meeting.startTime) * 56 / 60, height: Math.max(24, (minuteOfDay(meeting.endTime) - minuteOfDay(meeting.startTime)) * 56 / 60) }}><span className="block text-[10px] text-info">{meeting.startTime}–{meeting.endTime}</span><span className="block break-words font-medium">{meeting.title}</span><span className="block text-muted">{meeting.clientName}</span></button>)}
              </div>; })}
            </div>
          </div>
        </>}
      </div>
    </div>
    <div className="flex flex-wrap gap-4 border-t border-line px-5 py-2 text-xs text-muted"><span><span className="mr-1 text-accent">●</span> Tasks</span><span><span className="mr-1 text-info">●</span> Client meetings</span><span className="ml-auto">Local time</span></div>
    <div className="border-t border-line p-5">
      {editor ? <CalendarEditor key={`${editor.kind}-${editor.kind === "task" ? editor.task?.id : editor.appointment?.id}-${editor.date}-${editor.time}`} editor={editor} tasks={visibleTasks} projects={projects} projectId={projectId} onClose={() => setEditor(null)} onAdd={onAdd} /> : <>
        <div className="mb-3 flex items-center justify-between"><h4 className="text-sm font-medium">{dayLabel(selected)}</h4><Button variant="link" className="text-xs" onClick={() => setEditor({ kind: "task", date: selected })}>Schedule something</Button></div>
        {selectedTasks.length + selectedMeetings.length === 0 ? <p className="text-sm text-muted">Nothing scheduled.</p> : <div className="grid gap-2 sm:grid-cols-2">{selectedTasks.map(taskButton)}{selectedMeetings.map(meetingButton)}</div>}
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
    <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {editor.kind === "task" ? <div className="sm:col-span-2"><Field label="Task"><Select value={taskId} required onChange={(e) => setTaskId(e.target.value)}><option value="">Choose an existing task</option>{tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</Select></Field><Button type="button" variant="link" className="mt-2 text-xs" onClick={() => onAdd(date)}>Create a new task</Button></div> : <>
        <Field label="Meeting title"><Input name="title" required defaultValue={appointment?.title} placeholder="Project check-in" /></Field>
        <Field label="Project"><Select name="projectId" defaultValue={appointment?.projectId ?? projectId}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</Select></Field>
        <Field label="Client name"><Input name="clientName" required defaultValue={appointment?.clientName} /></Field>
        <Field label="Client email (optional)"><Input name="clientEmail" type="email" defaultValue={appointment?.clientEmail} /></Field>
      </>}
      <Field label="Date"><Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label={editor.kind === "task" ? "Time (blank for all day)" : "Start time"}><Input type="time" required={editor.kind === "meeting"} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      {editor.kind === "meeting" && <><Field label="End time"><Input name="endTime" type="time" required defaultValue={appointment?.endTime ?? (editor.time ? `${String(Math.min(23, Number(editor.time.slice(0, 2)) + 1)).padStart(2, "0")}:${editor.time.startsWith("23") ? "59" : "00"}` : "10:00")} /></Field><Field label="Location or call link"><Input name="location" defaultValue={appointment?.location} placeholder="Office or video link" /></Field><Field label="Notes" className="sm:col-span-2 lg:col-span-4"><Textarea name="notes" rows={2} defaultValue={appointment?.notes} /></Field></>}
    </fieldset>
    {task && <p className="whitespace-pre-wrap text-sm text-muted">{task.description || "No description added."}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>{editor.kind === "meeting" ? <p className="text-xs text-muted">Saved to Product Studio. No invitation is sent.</p> : task?.scheduledDate && <Button type="button" variant="ghost" disabled={pending} onClick={() => run(() => scheduleTaskAction(task.id))}>Remove from calendar</Button>}</div>
      <div className="flex gap-2">{appointment && <Button type="button" variant="ghost" className="text-danger" disabled={pending} onClick={() => { if (confirm(`Delete “${appointment.title}”?`)) run(() => deleteAppointmentAction(appointment.id)); }}>Delete meeting</Button>}<Button type="submit" variant="primary" disabled={pending || (editor.kind === "task" && !taskId)}>{pending ? "Saving…" : editor.kind === "task" ? "Save schedule" : "Save meeting"}</Button></div>
    </div>
  </form>;
}
