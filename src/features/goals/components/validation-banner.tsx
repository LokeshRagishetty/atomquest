"use client";

import { AlertCircle } from "lucide-react";

export function ValidationBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
      <AlertCircle className="h-4 w-4" />
      <div>{message}</div>
    </div>
  );
}
