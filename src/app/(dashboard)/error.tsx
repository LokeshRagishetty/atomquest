"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("dashboard.error_boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="page-shell">
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Dashboard could not load</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Refresh the route and try again. If this keeps happening, the server logs include the failure details.
        </p>
        <Button className="mt-6" type="button" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </main>
  );
}
