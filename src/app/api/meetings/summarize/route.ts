export const runtime = "nodejs";
export const maxDuration = 60;

interface MeetingTask {
  title: string;
  description?: string;
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

const transcriptionModel = process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";
const summaryModel = process.env.OPENAI_SUMMARY_MODEL ?? "gpt-5";

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const audio = form.get("audio");
  const projectName = String(form.get("projectName") ?? "this project");

  if (!(audio instanceof Blob)) {
    return Response.json({ ok: false, error: "Audio file is required." }, { status: 400 });
  }

  const transcript = await transcribe(apiKey, audio);
  const summary = await summarize(apiKey, transcript, projectName);

  return Response.json({ ok: true, summary: { ...summary, transcript } });
}

async function transcribe(apiKey: string, audio: Blob): Promise<string> {
  const form = new FormData();
  form.set("model", transcriptionModel);
  form.set("file", audio, "meeting.webm");
  form.set("prompt", "Client project meeting. Preserve product names, client names, dates, and task wording.");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Transcription failed: ${detail}`);
  }

  const json = await res.json();
  if (typeof json.text !== "string") throw new Error("Transcription did not return text.");
  return json.text;
}

async function summarize(
  apiKey: string,
  transcript: string,
  projectName: string
): Promise<Omit<MeetingSummary, "transcript">> {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: summaryModel,
      input: [
        {
          role: "system",
          content:
            "You summarize client/product meetings for a solo founder. Extract only grounded, actionable information. Return strict JSON only.",
        },
        {
          role: "user",
          content: `Project: ${projectName}

Transcript:
${transcript}

Return JSON with this exact shape:
{
  "title": "short meeting title",
  "summary": "3-5 sentence plain-English summary",
  "clientContext": ["important client preferences, constraints, context"],
  "decisions": ["decisions made"],
  "tasks": [{"title": "action item", "description": "optional implementation detail"}],
  "followUps": ["questions or follow-ups"]
}

Do not invent tasks. If the conversation implies no task, return an empty tasks array.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Summary failed: ${detail}`);
  }

  const json = await res.json();
  const text = extractText(json);
  return normalizeSummary(JSON.parse(text));
}

function extractText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if ("output_text" in value && typeof value.output_text === "string") return value.output_text;
  if ("text" in value && typeof value.text === "string") return value.text;
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("\n");
  return Object.values(value).map(extractText).filter(Boolean).join("\n");
}

function normalizeSummary(input: Partial<MeetingSummary>): Omit<MeetingSummary, "transcript"> {
  return {
    title: typeof input.title === "string" ? input.title : "Meeting summary",
    summary: typeof input.summary === "string" ? input.summary : "",
    clientContext: stringArray(input.clientContext),
    decisions: stringArray(input.decisions),
    tasks: Array.isArray(input.tasks)
      ? input.tasks
          .map((task) => ({
            title: typeof task?.title === "string" ? task.title.trim() : "",
            description: typeof task?.description === "string" ? task.description.trim() : undefined,
          }))
          .filter((task) => task.title)
      : [],
    followUps: stringArray(input.followUps),
  };
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

