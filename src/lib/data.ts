import type {
  Project,
  Focus,
  FocusTask,
  Signal,
  ActivityItem,
  Alert,
  SpendCategory,
  Integration,
  RoadmapItem,
  Decision,
} from "./types";

/**
 * The "now" the studio is anchored to — matches the approved mockup header
 * (Sat, June 7 2026, 2:41 PM). Keeping a fixed clock makes relative labels
 * like "2d ago" / "expires in 41 days" deterministic across the app.
 */
export const NOW = new Date("2026-06-07T14:41:00");

export const projects: Project[] = [
  {
    id: "home-cooked",
    name: "Home Cooked",
    tagline: "Cookbook Platform",
    status: "Active",
    progress: 83,
    nextMilestone: "Family Sharing MVP",
    openTasks: 3,
    blockers: 1,
    lastActivityIso: "2026-06-05T16:20:00",
    accent: "amber",
    icon: "chef",
    repo: "noahg/home-cooked",
    domain: "tryhomecooked.com",
  },
  {
    id: "wardrobe-harmony",
    name: "WardrobeHarmony",
    tagline: "Colorblind Closet",
    status: "Active",
    progress: 48,
    nextMilestone: "Closet Import",
    openTasks: 5,
    blockers: 0,
    lastActivityIso: "2026-05-24T11:00:00",
    accent: "violet",
    icon: "shirt",
    repo: "noahg/wardrobe-harmony",
    domain: "wardrobeharmony.com",
  },
  {
    id: "personal-trainer",
    name: "PersonalTrainer",
    tagline: "Trainer Management",
    status: "Planning",
    progress: 21,
    nextMilestone: "Client Scheduling",
    openTasks: 4,
    blockers: 0,
    lastActivityIso: "2026-05-09T09:30:00",
    accent: "blue",
    icon: "dumbbell",
    repo: "noahg/personal-trainer",
  },
  {
    id: "cascade-lounge",
    name: "Cascade Lounge",
    tagline: "Lifestyle & Content",
    status: "Content",
    progress: 35,
    nextMilestone: "Spring Content Drop",
    openTasks: 2,
    blockers: 0,
    lastActivityIso: "2026-05-31T18:00:00",
    accent: "orange",
    icon: "sofa",
    domain: "cascadelounge.co",
  },
];

export const focus: Focus = {
  projectId: "home-cooked",
  title: "Home Cooked — Family Sharing MVP",
  priority: "High",
  summary:
    "Allow families to share cookbooks and recipes with custom permissions.",
  progress: 83,
  tasks: [
    { id: "f1", label: "Design sharing permissions", state: "done" },
    { id: "f2", label: "Invite flow wireframes", state: "done" },
    { id: "f3", label: "Build share links backend", state: "done" },
    { id: "f4", label: "Update settings UI", state: "active", estimate: "~3h" },
    { id: "f5", label: "Permission edge-case tests", state: "todo", estimate: "~2h" },
    { id: "f6", label: "Ship behind feature flag", state: "todo", estimate: "~1h" },
  ],
};

export const integrations: Integration[] = [
  { key: "vercel", name: "Vercel", connected: true, detail: "All deployments successful" },
  { key: "supabase", name: "Supabase", connected: true, detail: "Storage 82%" },
  { key: "github", name: "GitHub", connected: true, detail: "All repositories synced" },
  { key: "cloudflare", name: "Cloudflare", connected: true, detail: "All domains healthy" },
  { key: "openai", name: "OpenAI API", connected: true, detail: "Normal usage" },
  { key: "anthropic", name: "Anthropic API", connected: true, detail: "Normal usage" },
];

export const signals: Signal[] = [
  { id: "s1", service: "Vercel", detail: "All deployments successful", level: "ok", integration: "vercel" },
  { id: "s2", service: "Supabase", detail: "Storage 82%", level: "warn", integration: "supabase" },
  { id: "s3", service: "GitHub", detail: "All repositories synced", level: "ok", integration: "github" },
  { id: "s4", service: "Domain Monitoring", detail: "All domains healthy", level: "ok", integration: "cloudflare" },
  { id: "s5", service: "OpenAI API", detail: "Normal usage", level: "ok", integration: "openai" },
];

export const activity: ActivityItem[] = [
  { id: "a1", kind: "commit", title: "Pushed 4 commits to main", projectId: "home-cooked", whenIso: "2026-06-07T12:41:00" },
  { id: "a2", kind: "issue", title: "Closed issue #27", projectId: "personal-trainer", whenIso: "2026-06-06T15:00:00" },
  { id: "a3", kind: "deploy", title: "Deployed to production", projectId: "wardrobe-harmony", whenIso: "2026-06-05T10:12:00", ok: true },
  { id: "a4", kind: "domain", title: "Domain tryhomecooked.com renewed", whenIso: "2026-06-05T08:00:00" },
  { id: "a5", kind: "infra", title: "Supabase usage at 82%", projectId: "home-cooked", whenIso: "2026-06-04T22:30:00" },
];

export const alerts: Alert[] = [
  {
    id: "al1",
    kind: "stale",
    projectId: "wardrobe-harmony",
    title: "WardrobeHarmony",
    detail: "No activity for 14 days",
    meta: "Next milestone: Closet Import",
    cta: "Open Roadmap",
  },
  {
    id: "al2",
    kind: "domain",
    title: "Domain Renewal",
    detail: "wardrobeharmony.com",
    meta: "Expires in 41 days",
    cta: "Manage",
  },
];

export const spend: SpendCategory[] = [
  { label: "Hosting", amount: 21.35, color: "#2dd4a7" },
  { label: "AI Tools", amount: 14.62, color: "#7c5cff" },
  { label: "Domains", amount: 6.4, color: "#f5a623" },
];

export const spendTotal = spend.reduce((sum, c) => sum + c.amount, 0);

export interface Expense {
  id: string;
  service: string;
  category: "Hosting" | "AI Tools" | "Domains";
  amount: number;
  projectId?: string;
  integration?: Integration["key"];
}

export const expenses: Expense[] = [
  { id: "e1", service: "Vercel Pro", category: "Hosting", amount: 20.0, integration: "vercel" },
  { id: "e2", service: "Supabase", category: "Hosting", amount: 1.35, projectId: "home-cooked", integration: "supabase" },
  { id: "e3", service: "OpenAI API", category: "AI Tools", amount: 8.42, projectId: "home-cooked", integration: "openai" },
  { id: "e4", service: "Anthropic API", category: "AI Tools", amount: 6.2, projectId: "wardrobe-harmony", integration: "anthropic" },
  { id: "e5", service: "tryhomecooked.com", category: "Domains", amount: 1.6, projectId: "home-cooked", integration: "cloudflare" },
  { id: "e6", service: "wardrobeharmony.com", category: "Domains", amount: 1.6, projectId: "wardrobe-harmony", integration: "cloudflare" },
  { id: "e7", service: "cascadelounge.co", category: "Domains", amount: 3.2, projectId: "cascade-lounge", integration: "cloudflare" },
];

/** Last 6 months of total spend for the trend sparkline. */
export const spendTrend = [
  { month: "Jan", amount: 31.1 },
  { month: "Feb", amount: 33.8 },
  { month: "Mar", amount: 29.4 },
  { month: "Apr", amount: 38.2 },
  { month: "May", amount: 40.05 },
  { month: "Jun", amount: spendTotal },
];

export const roadmap: RoadmapItem[] = [
  // NOW
  { id: "r1", title: "Family Sharing MVP", projectId: "home-cooked", column: "now", effort: "M", tag: "milestone" },
  { id: "r2", title: "Settings UI refresh", projectId: "home-cooked", column: "now", effort: "S" },
  { id: "r3", title: "Closet Import", projectId: "wardrobe-harmony", column: "now", effort: "L", tag: "milestone" },
  // NEXT
  { id: "r4", title: "Recipe import from URL", projectId: "home-cooked", column: "next", effort: "M" },
  { id: "r5", title: "Color-match recommendations", projectId: "wardrobe-harmony", column: "next", effort: "L" },
  { id: "r6", title: "Client scheduling", projectId: "personal-trainer", column: "next", effort: "M", tag: "milestone" },
  { id: "r7", title: "Spring content drop", projectId: "cascade-lounge", column: "next", effort: "S" },
  // LATER
  { id: "r8", title: "Mobile app shell", projectId: "home-cooked", column: "later", effort: "L" },
  { id: "r9", title: "Stripe billing", projectId: "personal-trainer", column: "later", effort: "M" },
  { id: "r10", title: "Newsletter automation", projectId: "cascade-lounge", column: "later", effort: "S" },
];

export const decisions: Decision[] = [
  {
    id: "d1",
    title: "Use Supabase row-level security for sharing",
    projectId: "home-cooked",
    status: "Decided",
    dateIso: "2026-06-02T00:00:00",
    rationale:
      "RLS keeps permission logic in one place and avoids leaking other families' data through the API layer.",
    options: ["App-layer checks", "Supabase RLS", "Separate share service"],
    chosen: "Supabase RLS",
  },
  {
    id: "d2",
    title: "Defer native mobile until web retention proves out",
    projectId: "home-cooked",
    status: "Decided",
    dateIso: "2026-05-20T00:00:00",
    rationale: "PWA covers 80% of mobile needs at ~10% of the cost while the core loop is still changing.",
    options: ["React Native now", "PWA first"],
    chosen: "PWA first",
  },
  {
    id: "d3",
    title: "Pricing model for PersonalTrainer",
    projectId: "personal-trainer",
    status: "Open",
    dateIso: "2026-06-01T00:00:00",
    rationale: "Per-seat vs per-client pricing — need to interview 5 trainers before committing.",
    options: ["Per-seat", "Per-active-client", "Flat tier"],
  },
  {
    id: "d4",
    title: "Whether to keep Cascade Lounge in the portfolio",
    projectId: "cascade-lounge",
    status: "Revisit",
    dateIso: "2026-05-15T00:00:00",
    rationale: "Content engagement is flat. Revisit at end of Q2 with traffic data.",
  },
];

// ---- Derived helpers used across screens ----

export function getProject(id?: string) {
  return projects.find((p) => p.id === id);
}

/**
 * Returns the rich, hand-authored focus for Home Cooked, or synthesizes a
 * believable milestone checklist for any other project from its progress.
 */
export function focusForProject(projectId: string): Focus {
  if (projectId === focus.projectId) return focus;
  const project = getProject(projectId);
  if (!project) return focus;

  const generic: { label: string; threshold: number }[] = [
    { label: "Scope & success criteria", threshold: 10 },
    { label: "Design / wireframes", threshold: 30 },
    { label: "Core implementation", threshold: 55 },
    { label: "Integration & data wiring", threshold: 75 },
    { label: "QA & edge cases", threshold: 90 },
    { label: "Ship", threshold: 100 },
  ];

  const tasks: FocusTask[] = generic.map((g, i) => {
    let state: FocusTask["state"] = "todo";
    if (project.progress >= g.threshold) state = "done";
    else if (generic[i - 1] && project.progress >= generic[i - 1].threshold) state = "active";
    return { id: `${projectId}-f${i}`, label: g.label, state };
  });

  return {
    projectId,
    title: `${project.name} — ${project.nextMilestone}`,
    priority: project.status === "Active" ? "High" : "Medium",
    summary: `Drive ${project.name} toward the "${project.nextMilestone}" milestone.`,
    progress: project.progress,
    tasks,
  };
}

export const studioStats = {
  projects: projects.length,
  active: projects.filter((p) => p.status === "Active").length,
  needsAttention: alerts.filter((a) => a.kind === "stale" || a.kind === "blocker").length || 1,
  monthlySpend: spendTotal,
};
