"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const DEFAULT_TABLES = ["goals", "checkins", "audit_logs"] as const;
const REFRESH_DEBOUNCE_MS = 500;

export function RealtimeRefresh({ tables = DEFAULT_TABLES }: { tables?: readonly string[] }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    let refreshTimer: number | null = null;
    const channels = tables.map((table) =>
      supabase
        .channel(`public:${table}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          if (refreshTimer) {
            window.clearTimeout(refreshTimer);
          }

          refreshTimer = window.setTimeout(() => {
            router.refresh();
          }, REFRESH_DEBOUNCE_MS);
        })
        .subscribe()
    );

    return () => {
      if (refreshTimer) {
        window.clearTimeout(refreshTimer);
      }
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [router, supabase, tables]);

  return null;
}
