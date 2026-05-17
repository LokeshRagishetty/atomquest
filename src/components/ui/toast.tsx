"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type ToastProps = {
  message: string;
  variant?: "default" | "success" | "error";
  duration?: number;
};

export function Toast({ message, variant = "default", duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(t);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-6 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-md px-4 py-2 text-sm shadow",
        variant === "error" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
      )}
      role="status"
    >
      {message}
    </div>
  );
}
