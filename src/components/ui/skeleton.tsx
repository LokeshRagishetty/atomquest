"use client";

import { cn } from "@/lib/utils";

export function UiSkeleton({ className = "h-4 w-full bg-muted/30 rounded", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export default UiSkeleton;
export const Skeleton = UiSkeleton;
