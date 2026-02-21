import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function UploadProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Upload</span>
        <span className="font-medium text-[color:var(--sinaxys-ink)]">{v}%</span>
      </div>
      <Progress
        value={v}
        className={cn(
          "h-2.5 overflow-hidden rounded-full bg-[color:var(--sinaxys-border)]",
          "[&>div]:bg-[color:var(--sinaxys-primary)] [&>div]:transition-all",
        )}
      />
    </div>
  );
}
