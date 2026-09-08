"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ProductInput } from "@/lib/domain";
import { Button, Card, Field, Input } from "@/components/ui";

export function ProductForm({
  open,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  error?: string | null;
  onSubmit: (input: ProductInput) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return <ProductFormFields key="new-product" pending={pending} error={error} onSubmit={onSubmit} onClose={onClose} />;
}

function ProductFormFields({ pending, error, onSubmit, onClose }: Omit<Parameters<typeof ProductForm>[0], "open">) {
  const [name, setName] = useState("");
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <Card className="my-4 w-full max-w-md p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">New product</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name }); }} className="space-y-4">
          <Field label="Product name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home Cooked" autoFocus />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex items-center justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="subtle" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={pending}>{pending ? "Creating..." : "Create product"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
