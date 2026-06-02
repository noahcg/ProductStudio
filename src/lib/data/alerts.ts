import type { Alert } from "../domain";

export const alerts: Alert[] = [
  {
    id: "al1",
    kind: "stale",
    projectId: "wardrobe-harmony",
    title: "WardrobeHarmony",
    detail: "No activity for 14 days",
    meta: "Next milestone: Closet Import",
    metricDays: 14,
    cta: "Open Roadmap",
  },
  {
    id: "al2",
    kind: "domain",
    title: "Domain Renewal",
    detail: "wardrobeharmony.com",
    meta: "Expires in 41 days",
    metricDays: 41,
    cta: "Manage",
  },
];
