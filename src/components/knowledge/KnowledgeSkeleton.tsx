import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function KnowledgeSpaceSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-9 w-32" />
      </CardContent>
    </Card>
  );
}

export function KnowledgePageSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export function KnowledgeHubSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Search Skeleton */}
      <Skeleton className="h-10 w-full" />

      {/* Favorites Skeleton */}
      <section>
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KnowledgePageSkeleton />
          <KnowledgePageSkeleton />
          <KnowledgePageSkeleton />
        </div>
      </section>

      {/* Recent Pages Skeleton */}
      <section>
        <Skeleton className="h-7 w-32 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KnowledgePageSkeleton />
          <KnowledgePageSkeleton />
          <KnowledgePageSkeleton />
        </div>
      </section>

      {/* Spaces Skeleton */}
      <section>
        <Skeleton className="h-7 w-24 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KnowledgeSpaceSkeleton />
          <KnowledgeSpaceSkeleton />
          <KnowledgeSpaceSkeleton />
        </div>
      </section>
    </div>
  );
}
