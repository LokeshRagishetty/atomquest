"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckinForm } from "./checkin-form";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RequestError } from "@/components/shared/request-error";
import type { Checkin } from "@/types/domain";

export function CheckinList({ goalId, quarter }: { goalId: string; quarter: string }) {
  const { currentUser } = useAuth();
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCheckin = useCallback(() => {
    let mounted = true;
    if (!currentUser) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError(null);
    fetch(`/api/checkins?goalId=${goalId}&quarter=${quarter}`)
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || "Unable to load check-in.");
        return json;
      })
      .then((json) => {
        if (!mounted) return;
        const raw = (json.checkins && json.checkins[0]) || null;
        if (!raw) return setCheckin(null);
        // Map possible snake_case DB row to domain Checkin
        const mapped: Checkin = {
          id: raw.id,
          goalId: raw.goal_id ?? raw.goalId,
          quarter: raw.quarter,
          achievement: raw.achievement,
          progressStatus: raw.progress_status ?? raw.progressStatus,
          managerComment: raw.manager_comment ?? raw.managerComment ?? null,
          completionPercentage: raw.completion_percentage ?? raw.completionPercentage ?? 0,
        };
        setCheckin(mapped);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [currentUser, goalId, quarter]);

  useEffect(() => loadCheckin(), [loadCheckin]);

  if (loading) return <div className="p-2 text-sm text-muted-foreground">Loading check-in…</div>;
  if (error) return <RequestError message={error} onRetry={loadCheckin} />;

  return <CheckinForm goalId={goalId} quarter={quarter} initial={checkin ?? undefined} />;
}
