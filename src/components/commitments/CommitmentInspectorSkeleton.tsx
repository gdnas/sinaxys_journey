import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <Card className="rounded-[28px] border-[color:var(--sinaxys-border)] bg-white/90 p-5 dark:bg-[color:var(--sinaxys-tint)]/80">
      <Skeleton className="h-4 w-24 rounded-full" />
      <Skeleton className="mt-4 h-8 w-2/3 rounded-full" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-4 w-full rounded-full" />
        ))}
      </div>
    </Card>
  );
}

export function CommitmentInspectorSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <SkeletonBlock lines={4} />
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SkeletonBlock lines={3} />
        <SkeletonBlock lines={3} />
      </div>
      <SkeletonBlock lines={4} />
      <SkeletonBlock lines={4} />
      <SkeletonBlock lines={3} />
      <SkeletonBlock lines={3} />
      <SkeletonBlock lines={3} />
    </div>
  );
}
