"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { Toast } from "@/components/ui/toast";

type ToastContextType = {
  show: (msg: string, variant?: "default" | "success" | "error") => void;
  addToast: (msg: string, variant?: "default" | "success" | "error") => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// safe variant that returns null when not inside provider
export function useToastSafe() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [variant, setVariant] = useState<"default" | "success" | "error">("default");

  const api = useMemo(
    () => ({
      show: (m: string, nextVariant: "default" | "success" | "error" = "default") => {
        setVariant(nextVariant);
        setMsg(m);
      },
      addToast: (m: string, nextVariant: "default" | "success" | "error" = "default") => {
        setVariant(nextVariant);
        setMsg(m);
      },
    }),
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {msg ? <Toast key={`${variant}:${msg}`} message={msg} variant={variant} /> : null}
    </ToastContext.Provider>
  );
}
