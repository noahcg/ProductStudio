import { projects, alerts, NOW } from "./data";
import type { Project } from "./types";
import { daysUntil } from "./utils";

export interface Recommendation {
  project: Project;
  score: number;
  reasons: string[];
}

/**
 * The heart of Product Studio: "What should I work on next?"
 *
 * A transparent scoring heuristic over the portfolio. Each project earns
 * points for momentum signals (close to a milestone, has blockers, is the
 * active focus) and loses points for staleness. Reasons are surfaced so the
 * recommendation is explainable rather than a black box.
 */
export function recommendations(now = NOW): Recommendation[] {
  return projects
    .map((project) => {
      const reasons: string[] = [];
      let score = 0;

      // Close to shipping a milestone — finish what's nearly done.
      if (project.progress >= 75) {
        score += 40;
        reasons.push(`${project.progress}% to "${project.nextMilestone}" — nearly shippable`);
      } else if (project.progress >= 40) {
        score += 15;
        reasons.push(`Steady progress on "${project.nextMilestone}"`);
      }

      // Blockers are the highest-leverage thing to clear.
      if (project.blockers > 0) {
        score += 35 * project.blockers;
        reasons.push(`${project.blockers} blocker${project.blockers > 1 ? "s" : ""} stalling progress`);
      }

      // Active projects beat planning/content for "next action".
      if (project.status === "Active") {
        score += 20;
      } else if (project.status === "Planning") {
        score += 5;
      }

      // Staleness penalty — but flag it as a reason to re-engage.
      const idleDays = Math.round(
        (now.getTime() - new Date(project.lastActivityIso).getTime()) / 86_400_000
      );
      if (idleDays >= 14) {
        score -= 15;
        reasons.push(`Idle ${idleDays} days — losing momentum`);
      }

      // Open alerts tied to the project add urgency.
      const projectAlerts = alerts.filter((a) => a.projectId === project.id);
      if (projectAlerts.length) {
        score += 10 * projectAlerts.length;
        reasons.push(...projectAlerts.map((a) => a.detail));
      }

      // Domain expiring soon is time-sensitive.
      if (project.domain) {
        const dom = alerts.find((a) => a.kind === "domain" && a.detail.includes(project.domain!));
        if (dom?.meta) {
          const days = parseInt(dom.meta.replace(/\D/g, ""), 10);
          if (days && days < 45) {
            score += 8;
            reasons.push(`Domain renews in ${days} days`);
          }
        }
      }

      return { project, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

export function topRecommendation(now = NOW) {
  return recommendations(now)[0];
}

export { daysUntil };
