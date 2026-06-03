import Link from "next/link";
import { AlertTriangle, GitBranch, Globe, Rocket, Database } from "lucide-react";
import type { Project } from "@/lib/types";
import type { ProjectHealth } from "@/lib/health/engine";
import type { GitHubProjectStatus } from "@/lib/integrations/github/types";
import type { DomainHealth } from "@/lib/domains/monitor";
import type { DeploymentHealth } from "@/lib/integrations/vercel/types";
import type { SupabaseHealth } from "@/lib/integrations/supabase/types";
import { cn, relativeTime } from "@/lib/utils";
import { projectIcons, accentStyles } from "@/components/icons";
import { Badge } from "@/components/ui";
import { HealthBadge } from "@/components/health-badge";

const domainTone: Record<DomainHealth, string> = {
  Healthy: "text-success",
  Watch: "text-info",
  Warning: "text-warning",
  Critical: "text-danger",
};

const deploymentTone: Record<DeploymentHealth, string> = {
  Healthy: "text-success",
  Warning: "text-warning",
  Critical: "text-danger",
};

const supabaseTone: Record<SupabaseHealth, string> = {
  Healthy: "text-success",
  Warning: "text-warning",
  Critical: "text-danger",
};

const statusTone = {
  Active: "active",
  Planning: "planning",
  Content: "content",
  Paused: "neutral",
  Shipped: "high",
} as const;

export function ProjectCard({
  project,
  health,
  github,
  domainHealth,
  deploymentHealth,
  supabaseHealth,
}: {
  project: Project;
  health?: ProjectHealth;
  github?: GitHubProjectStatus;
  domainHealth?: DomainHealth;
  deploymentHealth?: DeploymentHealth;
  supabaseHealth?: SupabaseHealth;
}) {
  const Icon = projectIcons[project.icon];
  const accent = accentStyles[project.accent];

  return (
    <Link
      href={`/focus?project=${project.id}`}
      className="project-card group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface/70 transition-colors hover:border-line-strong"
    >
      {/* Header / image area */}
      <div className={cn("relative h-[92px] bg-gradient-to-br", accent.gradient)}>
        {/* Top badges share one row so they never overlap; health truncates
            before it can collide with the status badge on narrow cards. */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {health ? (
            <HealthBadge
              score={health.score}
              status={health.status}
              className="min-w-0 rounded-full bg-bg/55 px-2 py-1 backdrop-blur-sm"
            />
          ) : (
            <span />
          )}
          <Badge tone={statusTone[project.status]} className="shrink-0">
            {project.status}
          </Badge>
        </div>
        <div
          className={cn(
            "absolute -bottom-5 left-4 grid h-12 w-12 place-items-center rounded-full bg-surface-2 ring-2",
            accent.ring
          )}
        >
          <Icon className="h-6 w-6 text-fg" />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-7">
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">{project.name}</h3>
        <p className="text-xs text-muted">{project.tagline}</p>

        {(github?.connected || domainHealth || deploymentHealth || supabaseHealth) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-faint">
            {github?.connected && (
              <span className="flex items-center gap-1.5">
                <GitBranch className="h-3 w-3" />
                {github.label}
              </span>
            )}
            {deploymentHealth && (
              <span className="flex items-center gap-1.5">
                <Rocket className="h-3 w-3" />
                <span className={cn(deploymentHealth !== "Healthy" && deploymentTone[deploymentHealth])}>
                  Deployment {deploymentHealth}
                </span>
              </span>
            )}
            {supabaseHealth && (
              <span className="flex items-center gap-1.5">
                <Database className="h-3 w-3" />
                <span className={cn(supabaseHealth !== "Healthy" && supabaseTone[supabaseHealth])}>
                  Supabase {supabaseHealth}
                </span>
              </span>
            )}
            {domainHealth && (
              <span className="flex items-center gap-1.5">
                <Globe className="h-3 w-3" />
                <span className={cn(domainHealth !== "Healthy" && domainTone[domainHealth])}>
                  Domain {domainHealth}
                </span>
              </span>
            )}
          </div>
        )}

        <div className="mt-3">
          <p className="mb-1.5 text-xs font-medium text-fg">
            {project.progress}% <span className="text-muted">to next milestone</span>
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${project.progress}%`, background: accent.bar }}
            />
          </div>
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <Stat value={String(project.openTasks)} label="Tasks" />
          <Stat
            value={String(project.blockers)}
            label={project.blockers === 1 ? "Blocker" : "Blockers"}
            warn={project.blockers > 0}
          />
          <Stat value={relativeTime(project.lastActivityIso)} label="Last activity" small />
        </div>
      </div>
    </Link>
  );
}

function Stat({
  value,
  label,
  warn,
  small,
}: {
  value: string;
  label: string;
  warn?: boolean;
  small?: boolean;
}) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1 font-semibold text-fg",
          small ? "text-xs" : "text-base",
          warn && "text-warning"
        )}
      >
        {warn && <AlertTriangle className="h-3 w-3" />}
        {value}
      </div>
      <div className="text-[11px] text-faint">{label}</div>
    </div>
  );
}
