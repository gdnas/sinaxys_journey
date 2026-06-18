import { Card } from "@/components/ui/card";

export function CommitmentInspectorEmptyState({ message }: { message: string }) {
  return (
    <Card className="rounded-3xl border-dashed border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/50 p-5 text-sm text-muted-foreground">
      {message}
    </Card>
  );
}
