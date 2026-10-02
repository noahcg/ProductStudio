import { useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  Cloud,
  Database,
  GitBranch,
  Mail,
  Server,
  Triangle,
} from "lucide-react";
import type { Product, Project } from "@/lib/domain";
import { Card } from "@/components/ui";

type ServiceGuideProps = {
  product?: Product;
  projects: Project[];
};

/**
 * A product-level reference for doing work in the services behind a product.
 * This deliberately describes where work happens rather than reporting health.
 */
export function ServiceGuide({ product, projects }: ServiceGuideProps) {
  const [expanded, setExpanded] = useState(false);
  const settings = product?.integrations;
  const projectWithRepo = projects.find((project) => project.repo);
  const vercelUrl = settings?.vercelProject
    ? `https://vercel.com/${settings.vercelTeamSlug ? `${settings.vercelTeamSlug}/` : ""}${settings.vercelProject}`
    : "https://vercel.com/dashboard";
  const supabaseUrl = settings?.supabaseProjectRef
    ? `https://supabase.com/dashboard/project/${settings.supabaseProjectRef}`
    : "https://supabase.com/dashboard/projects";
  const githubUrl = projectWithRepo?.repo
    ? `https://github.com/${projectWithRepo.repo}`
    : "https://github.com";

  const services = [
    {
      name: "Vercel",
      summary: "Hosts and deploys this product’s website.",
      task: "Deploy a change, check a build, or manage environment variables.",
      href: vercelUrl,
      action: "Open hosting",
      Icon: Triangle,
    },
    {
      name: "Cloudflare",
      summary: "Owns the domain, DNS, and email routing.",
      task: "Add an email forwarding address: select the domain, then open Email → Email Routing.",
      href: "https://dash.cloudflare.com/",
      action: "Open domains & email",
      Icon: Cloud,
    },
    {
      name: "Supabase",
      summary: "Stores the product’s database, authentication, and files.",
      task: "Inspect data, update authentication, or manage storage.",
      href: supabaseUrl,
      action: "Open data",
      Icon: Database,
    },
    {
      name: "GitHub",
      summary: "Holds the source code and change history.",
      task: "Review code, create an issue, or manage pull requests.",
      href: githubUrl,
      action: "Open code",
      Icon: GitBranch,
    },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className={expanded ? "border-b border-line bg-surface-2/35" : "bg-surface-2/35"}>
        <button
          type="button"
          className="flex w-full items-center gap-2 px-5 py-4 text-left"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          aria-controls="service-guide-details"
        >
          <Server className="h-4 w-4 text-accent" />
          <span className="text-[15px] font-semibold tracking-tight text-fg">Service guide</span>
          <ChevronDown className={`ml-auto h-4 w-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded && (
          <p className="px-5 pb-4 text-xs leading-relaxed text-muted">
            Where to go when you need to make a change outside Product Studio.
          </p>
        )}
      </div>

      {expanded && <ul id="service-guide-details" className="divide-y divide-line">
        {services.map(({ name, summary, task, href, action, Icon }) => (
          <li key={name} className="px-5 py-4">
            <div className="flex gap-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-2 text-accent ring-1 ring-inset ring-line">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-semibold text-fg">{name}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{summary}</p>
                <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-fg">
                  {name === "Cloudflare" && <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-info" />}
                  <span><span className="font-medium">Go here to: </span>{task}</span>
                </p>
                <a
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {action} <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
      }
    </Card>
  );
}
