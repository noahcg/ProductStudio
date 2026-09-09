"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { Product, ProductInput } from "@/lib/domain";
import { Button, Card, Field, Input } from "@/components/ui";

export function ProductForm({
  open,
  initial,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  initial?: Product | null;
  pending: boolean;
  error?: string | null;
  onSubmit: (input: ProductInput) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return <ProductFormFields key={initial?.id ?? "new-product"} initial={initial} pending={pending} error={error} onSubmit={onSubmit} onClose={onClose} />;
}

function ProductFormFields({ initial, pending, error, onSubmit, onClose }: Omit<Parameters<typeof ProductForm>[0], "open">) {
  const [name, setName] = useState(initial?.name ?? "");
  const [vercelProject, setVercelProject] = useState(initial?.integrations.vercelProject ?? "");
  const [vercelTeamSlug, setVercelTeamSlug] = useState(initial?.integrations.vercelTeamSlug ?? "");
  const [supabaseProjectRef, setSupabaseProjectRef] = useState(initial?.integrations.supabaseProjectRef ?? "");
  const [cloudflareAccountId, setCloudflareAccountId] = useState(initial?.integrations.cloudflareAccountId ?? "");
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="my-4 w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{initial ? "Product settings" : "New product"}</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, integrations: { vercelProject, vercelTeamSlug, supabaseProjectRef, cloudflareAccountId } }); }} className="space-y-4">
          <Field label="Product name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Cooked" autoFocus />
          </Field>
          <div className="space-y-3 border-t border-line pt-4">
            <div>
              <h3 className="text-sm font-semibold text-fg">Connected services</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">Store project IDs here. Access tokens stay in the server environment.</p>
            </div>
            <Field label="Vercel project name">
              <Input value={vercelProject} onChange={(e) => setVercelProject(e.target.value)} placeholder="my-product" />
            </Field>
            <Field label="Vercel team slug (optional)">
              <Input value={vercelTeamSlug} onChange={(e) => setVercelTeamSlug(e.target.value)} placeholder="your-team" />
            </Field>
            <Field label="Supabase project reference">
              <Input value={supabaseProjectRef} onChange={(e) => setSupabaseProjectRef(e.target.value)} placeholder="abcdefghijklmnopqrst" />
            </Field>
            <Field label="Cloudflare account ID (optional override)">
              <Input value={cloudflareAccountId} onChange={(e) => setCloudflareAccountId(e.target.value)} placeholder="Account ID for this product's domains" />
            </Field>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Saving..." : initial ? "Save settings" : "Create product"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
