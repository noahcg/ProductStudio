import { validateSchedule } from "@/lib/tasks/schedule";
import { revalidatePath } from "next/cache";
import type { TaskInput, TaskSource, TaskStatus } from "@/lib/domain";
import { createTask } from "@/lib/data";

export const runtime = "nodejs";

type RawTask = {
  projectId?: unknown;
  milestoneId?: unknown;
  title?: unknown;
  description?: unknown;
  status?: unknown;
  source?: unknown;
  scheduledDate?: unknown;
  scheduledTime?: unknown;
};

export async function POST(request: Request) {
  const authError = authorize(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "Expected a JSON body." }, { status: 400 });
  }

  const rawTasks = extractTasks(body);
  if (rawTasks.length === 0) {
    return Response.json({ ok: false, error: "Provide a task or tasks array." }, { status: 400 });
  }

  const tasks: TaskInput[] = [];
  for (const raw of rawTasks) {
    const input = normalizeTask(raw);
    if ("error" in input) {
      return Response.json({ ok: false, error: input.error }, { status: 400 });
    }
    tasks.push(input);
  }

  try {
    const created = [];
    for (const task of tasks) created.push(await createTask(task));
    revalidatePath("/projects");
    revalidatePath("/focus");
    revalidatePath("/");
    return Response.json({ ok: true, tasks: created }, { status: 201 });
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error)?.message ?? "Failed to create task." },
      { status: 500 }
    );
  }
}

function authorize(request: Request): Response | null {
  const token = process.env.TASK_API_TOKEN;
  if (!token) return null;
  const header = request.headers.get("authorization");
  if (header === `Bearer ${token}`) return null;
  return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
}

function extractTasks(body: unknown): RawTask[] {
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body)) return body as RawTask[];
  if ("tasks" in body && Array.isArray(body.tasks)) return body.tasks as RawTask[];
  return [body as RawTask];
}

function normalizeTask(raw: RawTask): TaskInput | { error: string } {
  const projectId = stringValue(raw.projectId);
  const title = stringValue(raw.title);
  if (!projectId) return { error: "projectId is required." };
  if (!title) return { error: "title is required." };

  const scheduleError = validateSchedule(raw.scheduledDate, raw.scheduledTime);
  if (scheduleError) return { error: scheduleError };

  return {
    scheduledDate: stringValue(raw.scheduledDate) || undefined,
    scheduledTime: stringValue(raw.scheduledTime) || undefined,
    projectId,
    milestoneId: stringValue(raw.milestoneId) || undefined,
    title,
    description: stringValue(raw.description) || undefined,
    status: normalizeStatus(raw.status),
    source: normalizeSource(raw.source),
  };
}

function normalizeStatus(value: unknown): TaskStatus {
  return value === "in_progress" || value === "completed" ? value : "todo";
}

function normalizeSource(value: unknown): TaskSource | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const label = stringValue(raw.label);
  if (!label) return undefined;
  const type = raw.type;
  return {
    label,
    type: type === "meeting" || type === "automation" || type === "import" ? type : "manual",
    url: stringValue(raw.url) || undefined,
    externalId: stringValue(raw.externalId) || undefined,
    capturedAt: stringValue(raw.capturedAt) || undefined,
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
