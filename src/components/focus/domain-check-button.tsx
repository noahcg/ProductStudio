"use client";

import { useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { checkProjectDomainsAction } from "@/app/projects/domain-actions";

export function DomainCheckButton({ projectId }: { projectId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function check() {
    setError(null);
    startTransition(async () => {
      const result = await checkProjectDomainsAction(projectId);
      if (!result.ok) return setError(result.error);
      window.location.reload();
    });
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <Button variant="subtle" className="w-full text-xs" onClick={check} disabled={pending}>
        <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
        {pending ? "Checking…" : "Check domain"}
      </Button>
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
