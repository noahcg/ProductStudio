"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { Loader2, Mic, Plus, Save, Square } from "lucide-react";
import type { Project, TaskPriority } from "@/lib/domain";
import { Button, Card, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createTaskAction } from "@/app/focus/actions";
import { setLocalStorageValue, useLocalStorageValue } from "@/lib/client-store";

interface StoredNote {
  id: string;
  projectId: string;
  title: string;
  body: string;
  createdAt: string;
  source: "manual" | "recording";
  tasks: string[];
  transcript?: string;
}

interface MeetingTask {
  title: string;
  priority?: TaskPriority;
}

interface MeetingSummary {
  title: string;
  summary: string;
  clientContext: string[];
  decisions: string[];
  tasks: MeetingTask[];
  followUps: string[];
  transcript: string;
}

const key = "product-studio-meeting-notes";

function parseNotes(value: string): StoredNote[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotes(notes: StoredNote[]) {
  setLocalStorageValue(key, JSON.stringify(notes));
}

export function MeetingNotes({
  projects,
  projectId,
}: {
  projects: Project[];
  projectId?: string;
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(projectId ?? projects[0]?.id ?? "");
  const activeProjectId = projectId ?? selectedProjectId;
  const notesValue = useLocalStorageValue(key, "[]");
  const notes = useMemo(() => parseNotes(notesValue), [notesValue]);
  const [body, setBody] = useState("");
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const selectedProject = projects.find((p) => p.id === activeProjectId);
  const projectNotes = useMemo(() => {
    return notes
      .filter((note) => note.projectId === activeProjectId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [notes, activeProjectId]);

  function saveNote() {
    const trimmed = body.trim();
    if (!trimmed || !selectedProject) return;
    const firstLine = trimmed.split("\n").find(Boolean) ?? "Meeting note";
    const note: StoredNote = {
      id: crypto.randomUUID(),
      projectId: selectedProject.id,
      title: firstLine.slice(0, 64),
      body: trimmed,
      createdAt: new Date().toISOString(),
      source: "manual",
      tasks: [],
    };
    const next = [note, ...notes];
    writeNotes(next);
    setBody("");
  }

  async function startRecording() {
    if (!selectedProject) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: preferredMimeType() });
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        void processRecording();
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      setError((err as Error)?.message ?? "Could not start recording.");
    }
  }

  function stopRecording() {
    if (!recorder.current || recorder.current.state === "inactive") return;
    setRecording(false);
    setProcessing(true);
    recorder.current.stop();
  }

  async function processRecording() {
    if (!selectedProject) return;
    const blob = new Blob(chunks.current, { type: recorder.current?.mimeType || "audio/webm" });
    const form = new FormData();
    form.set("projectId", selectedProject.id);
    form.set("projectName", selectedProject.name);
    form.set("audio", blob, "meeting.webm");

    try {
      const res = await fetch("/api/meetings/summarize", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Meeting summary failed.");
      const summary = json.summary as MeetingSummary;
      saveSummaryNote(summary, selectedProject.id);
      createTasks(summary.tasks, selectedProject.id);
    } catch (err) {
      setError((err as Error)?.message ?? "Could not process recording.");
    } finally {
      setProcessing(false);
      chunks.current = [];
      recorder.current = null;
    }
  }

  function saveSummaryNote(summary: MeetingSummary, projectId: string) {
    const body = formatSummary(summary);
    const note: StoredNote = {
      id: crypto.randomUUID(),
      projectId,
      title: summary.title || "Meeting summary",
      body,
      createdAt: new Date().toISOString(),
      source: "recording",
      tasks: summary.tasks.map((task) => task.title),
      transcript: summary.transcript,
    };
    const next = [note, ...notes];
    writeNotes(next);
  }

  function createTasks(tasks: MeetingTask[], projectId: string) {
    if (tasks.length === 0) return;
    startTransition(async () => {
      for (const task of tasks) {
        await createTaskAction({
          projectId,
          title: task.title,
          status: "todo",
          priority: task.priority ?? "medium",
        });
      }
    });
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">Meeting Notes</h2>
          <p className="mt-1 text-xs text-muted">{projectNotes.length} saved for this project</p>
        </div>
        <Button
          variant={recording ? "primary" : "subtle"}
          className="text-xs"
          onClick={recording ? stopRecording : startRecording}
          disabled={processing || pending || !selectedProject}
        >
          {processing || pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : recording ? (
            <Square className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {processing || pending ? "Saving" : recording ? "Stop/Save" : "Record"}
        </Button>
      </div>

      {!projectId && (
        <div className="mt-4 flex flex-wrap gap-2">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                activeProjectId === project.id
                  ? "bg-accent text-accent-fg"
                  : "bg-surface-2 text-muted hover:text-fg"
              )}
            >
              {project.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={7}
          placeholder="Meeting notes, client context, decisions, follow-ups..."
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button variant="ghost" className="text-xs" onClick={() => setBody("")}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
          <Button variant="primary" className="text-xs" onClick={saveNote} disabled={!body.trim()}>
            <Save className="h-3.5 w-3.5" /> Save note
          </Button>
        </div>
        {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      </div>

      {projectNotes.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-line pt-4">
          {projectNotes.slice(0, 3).map((note) => (
            <details key={note.id} className="rounded-lg border border-line bg-surface-2/45 px-3 py-2">
              <summary className="cursor-pointer text-xs font-medium text-fg">
                {note.title}
                <span className="ml-2 font-normal text-faint">
                  {new Date(note.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                {note.tasks.length > 0 && (
                  <span className="ml-2 font-normal text-accent">{note.tasks.length} tasks</span>
                )}
              </summary>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted">{note.body}</p>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}

function preferredMimeType() {
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return "";
}

function formatSummary(summary: MeetingSummary) {
  const sections: Array<[string, string[]]> = [
    ["Summary", [summary.summary]],
    ["Client Context", summary.clientContext],
    ["Decisions", summary.decisions],
    ["Action Items", summary.tasks.map((task) => task.title)],
    ["Follow Ups", summary.followUps],
  ];
  return sections
    .filter(([, items]) => items.length > 0 && items.some(Boolean))
    .map(([heading, items]) => `${heading}\n${items.map((item) => `- ${item}`).join("\n")}`)
    .join("\n\n");
}
