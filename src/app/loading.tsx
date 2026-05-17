import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="page-shell">
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </main>
  );
}
