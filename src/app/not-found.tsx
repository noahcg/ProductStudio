import { LinkButton } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div>
        <h2 className="text-2xl font-bold text-fg">Page not found</h2>
        <p className="mt-1 text-sm text-muted">That page doesn&apos;t exist in the studio.</p>
      </div>
      <LinkButton href="/" variant="primary">
        Back to Studio
      </LinkButton>
    </div>
  );
}
