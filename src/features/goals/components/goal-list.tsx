"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { GoalCard } from "@/features/goals/components/goal-card";
import { WeightageIndicator } from "@/features/goals/components/weightage-indicator";
import { ValidationBanner } from "@/features/goals/components/validation-banner";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { RequestError } from "@/components/shared/request-error";
import { useToastSafe } from "@/components/ui/toast-provider";
import { validateGoalPortfolio } from "@/lib/validation/goal";
import type { Goal } from "@/types/domain";

export function GoalList() {
  const { currentUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToastSafe();

  const loadGoals = useCallback(() => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);
    fetch("/api/goals")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || "Unable to load goals.");
        return json;
      })
      .then((json) => {
        setGoals((json.goals || []) as Goal[]);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const portfolioValidation = useMemo(() => validateGoalPortfolio(goals), [goals]);

  async function handleSave(updated: Goal) {
    setGoals((g) => g.map((x) => (x.id === updated.id ? updated : x)));
  }

  async function handleDelete(id: string) {
    setGoals((g) => g.filter((x) => x.id !== id));
  }

  async function handleSubmitAll() {
    if (!currentUser) return;
    if (!portfolioValidation.valid) {
      setError(portfolioValidation.message);
      return;
    }

    const ids = goals.map((g) => g.id);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/goals/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalIds: ids }),
      });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || "Submit failed");
      // Refresh from server to ensure persistence
      toast?.show("Goals submitted successfully", "success");
      const refreshRes = await fetch("/api/goals");
      const refreshJson = await refreshRes.json();
      if (!refreshRes.ok) throw new Error(refreshJson?.error || "Refresh failed");
      setGoals((refreshJson.goals || []) as Goal[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg || "Submit failed");
      toast?.show(msg || "Submit failed", "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div>
          <PageHeader eyebrow="Employee" title="My Goals" description="Drafts, submissions and status." />
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightageIndicator goals={goals} />
              <div className="mt-4">
                <Button className="w-full" onClick={handleSubmitAll} disabled={submitting || !portfolioValidation.valid}>
                  {submitting ? "Submitting..." : "Submit all goals"}
                </Button>
              </div>
              {!portfolioValidation.valid ? <div className="mt-3"><ValidationBanner message={portfolioValidation.message} /></div> : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading goals...</div>
        ) : goals.length === 0 ? (
          <div className="col-span-full rounded-md border p-6 text-center">No goals yet. Create your first draft.</div>
        ) : (
          goals.map((g) => (
            <GoalCard key={g.id} goal={g} onSaved={handleSave} onDeleted={handleDelete} disabled={g.locked} />
          ))
        )}
      </div>

      {error ? <RequestError message={error} onRetry={loadGoals} /> : null}
    </div>
  );
}
