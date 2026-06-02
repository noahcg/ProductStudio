import type { ActivityItem } from "../types";

export const activity: ActivityItem[] = [
  { id: "a1", kind: "commit", title: "Pushed 4 commits to main", projectId: "home-cooked", whenIso: "2026-06-07T12:41:00" },
  { id: "a2", kind: "issue", title: "Closed issue #27", projectId: "personal-trainer", whenIso: "2026-06-06T15:00:00" },
  { id: "a3", kind: "deploy", title: "Deployed to production", projectId: "wardrobe-harmony", whenIso: "2026-06-05T10:12:00", ok: true },
  { id: "a4", kind: "domain", title: "Domain tryhomecooked.com renewed", whenIso: "2026-06-05T08:00:00" },
  { id: "a5", kind: "infra", title: "Supabase usage at 82%", projectId: "home-cooked", whenIso: "2026-06-04T22:30:00" },
];
