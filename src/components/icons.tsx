import {
  ChefHat,
  Shirt,
  Dumbbell,
  Sofa,
  GitCommitHorizontal,
  CircleCheck,
  Rocket,
  Globe,
  Database,
  GitBranch,
  Triangle,
  Zap,
  Cloud,
  Sparkles,
  Brain,
  type LucideIcon,
} from "lucide-react";
import type { Project, ActivityKind, Integration } from "@/lib/types";

export const projectIcons: Record<Project["icon"], LucideIcon> = {
  chef: ChefHat,
  shirt: Shirt,
  dumbbell: Dumbbell,
  sofa: Sofa,
};

export const activityIcons: Record<ActivityKind, LucideIcon> = {
  commit: GitCommitHorizontal,
  issue: CircleCheck,
  deploy: Rocket,
  domain: Globe,
  infra: Database,
};

export const integrationIcons: Record<Integration["key"], LucideIcon> = {
  github: GitBranch,
  vercel: Triangle,
  supabase: Zap,
  cloudflare: Cloud,
  openai: Sparkles,
  anthropic: Brain,
};

/** Tailwind-friendly accent → gradient + text color used by project tiles. */
export const accentStyles: Record<
  Project["accent"],
  { gradient: string; ring: string; bar: string }
> = {
  amber: { gradient: "from-amber-500/30 to-amber-700/10", ring: "ring-amber-500/30", bar: "#f5a623" },
  violet: { gradient: "from-violet-500/30 to-fuchsia-700/10", ring: "ring-violet-500/30", bar: "#7c5cff" },
  blue: { gradient: "from-sky-500/30 to-blue-700/10", ring: "ring-sky-500/30", bar: "#4f8cff" },
  orange: { gradient: "from-orange-500/30 to-rose-700/10", ring: "ring-orange-500/30", bar: "#f97316" },
  green: { gradient: "from-emerald-500/30 to-green-700/10", ring: "ring-emerald-500/30", bar: "#2dd4a7" },
  teal: { gradient: "from-teal-500/30 to-cyan-700/10", ring: "ring-teal-500/30", bar: "#2dd4bf" },
};
