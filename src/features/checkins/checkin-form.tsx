"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastSafe } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { ProgressStatus } from "@/types/domain";

const statusOptions = [
  { value: "not_started", label: "Not Started" },
  { value: "on_track", label: "On Track" },
  { value: "completed", label: "Completed" },
  { value: "delayed", label: "Delayed" },
];

export function CheckinForm({ goalId, quarter, initial }: { goalId: string; quarter: string; initial?: unknown }) {
  const { currentUser } = useAuth();
  const toastApi = useToastSafe();

  type FormValues = {
    achievement: string;
    progressStatus: ProgressStatus;
    managerComment?: string | null;
  };

  // `initial` may come from server DB row (snake_case) or domain object (camelCase).
  const asRecord = (v: unknown): Record<string, unknown> => (typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {});
  const src = asRecord(initial);

  const getStr = (k1: string, k2?: string) => {
    const a = src[k1];
    if (typeof a === "string") return a;
    if (k2) {
      const b = src[k2];
      if (typeof b === "string") return b;
    }
    return "";
  };

  const getStatus = (k1: string, k2?: string) => {
    const a = src[k1];
    if (typeof a === "string") return a as ProgressStatus;
    if (k2) {
      const b = src[k2];
      if (typeof b === "string") return b as ProgressStatus;
    }
    return "not_started" as ProgressStatus;
  };

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      achievement: getStr("achievement", "achievement"),
      progressStatus: getStatus("progressStatus", "progress_status"),
      managerComment: getStr("managerComment", "manager_comment"),
    },
  });

  const [saving, setSaving] = useState(false);

  async function onSubmit(values: FormValues) {
    if (!currentUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/checkins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, quarter, achievement: values.achievement, progressStatus: values.progressStatus, managerComment: values.managerComment ?? null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");
      toastApi?.show("Check-in saved", "success");
    } catch (error) {
      toastApi?.show(error instanceof Error ? error.message : "Check-in save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
      <div className="grid gap-2">
        <Label htmlFor="achievement">Achievement</Label>
        <Input id="achievement" {...register("achievement")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="progressStatus">Progress status</Label>
        <select id="progressStatus" {...register("progressStatus")} className="h-10 rounded-md border bg-background px-3">
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save check-in"}</Button>
      </div>
    </form>
  );
}
