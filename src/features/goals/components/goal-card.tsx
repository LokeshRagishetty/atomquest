"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Save, Edit3 } from "lucide-react";
import type { Goal } from "@/types/domain";
import { goalFormSchema, type GoalFormValues } from "@/lib/validation/goal";
import { Toast } from "@/components/ui/toast";
import { useToastSafe } from "@/components/ui/toast-provider";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

export function GoalCard({
  goal,
  onSaved,
  onDeleted,
  disabled,
}: {
  goal: Goal;
  onSaved: (g: Goal) => void;
  onDeleted: (id: string) => void;
  disabled?: boolean;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      thrustArea: goal.thrustArea,
      title: goal.title,
      description: goal.description,
      uomType: goal.uomType,
      target: goal.target,
      weightage: goal.weightage,
    },
  });

  const [toast, setToast] = useState<string | null>(null);
  const toastApi = useToastSafe();
  const [editing, setEditing] = useState(false);
  const saveRef = useRef<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    reset({
      thrustArea: goal.thrustArea,
      title: goal.title,
      description: goal.description,
      uomType: goal.uomType,
      target: goal.target,
      weightage: goal.weightage,
    });
  }, [goal, reset]);

  // autosave on change
  const watched = watch();
  useEffect(() => {
    if (!editing) return;

    if (saveRef.current) window.clearTimeout(saveRef.current);
    saveRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/goals/${goal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: watched }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "Failed to save");
        if (toastApi) toastApi.show("Draft saved", "success"); else setToast("Draft saved");
        onSaved(json.goal);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (toastApi) toastApi.show(msg || "Save failed", "error"); else setToast(msg || "Save failed");
      }
    }, 900);

    return () => {
      if (saveRef.current) window.clearTimeout(saveRef.current);
    };
  }, [watched, editing, goal.id, onSaved, toastApi]);

  async function handleDelete() {
    // open confirmation dialog instead
    setConfirmOpen(true);
  }

  return (
    <Card className={`relative ${disabled ? "opacity-70" : ""}`}>
      <CardHeader className="flex items-center justify-between">
        <div className="space-y-2">
          <CardTitle className="text-sm font-semibold">{goal.title}</CardTitle>
          <Badge variant={goal.status === "approved" ? "success" : goal.status === "submitted" ? "warning" : goal.status === "rejected" ? "destructive" : "outline"}>
            {goal.status}
          </Badge>
        </div>
          <div className="flex items-center gap-2">
          {!goal.locked ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing((v) => !v)} aria-label="Edit goal">
              <Edit3 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
          {!goal.locked ? (
            <Button size="sm" variant="destructive" onClick={handleDelete} aria-label="Delete goal">
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {goal.status === "rejected" && goal.reviewComment ? (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {goal.reviewComment}
          </div>
        ) : null}
        <form onSubmit={handleSubmit(() => {})} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor={`thrust-${goal.id}`}>Thrust Area</Label>
            <Input id={`thrust-${goal.id}`} disabled={!editing || goal.locked} {...register("thrustArea")} />
            {errors.thrustArea ? <p className="text-sm text-destructive">{errors.thrustArea.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`title-${goal.id}`}>Title</Label>
            <Input id={`title-${goal.id}`} disabled={!editing || goal.locked || !!goal.sharedGoalId} {...register("title")} />
            {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor={`description-${goal.id}`}>Description</Label>
            <textarea id={`description-${goal.id}`} disabled={!editing || goal.locked} className="rounded-md border bg-background px-3 py-2" {...register("description")} />
            {errors.description ? <p className="text-sm text-destructive">{errors.description.message}</p> : null}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor={`uom-${goal.id}`}>UoM Type</Label>
              <select id={`uom-${goal.id}`} disabled={!editing || goal.locked} className="h-10 rounded-md border bg-background px-3" {...register("uomType")}>
                <option value="numeric_min">Numeric Min</option>
                <option value="numeric_max">Numeric Max</option>
                <option value="percentage">Percentage</option>
                <option value="timeline">Timeline</option>
                <option value="zero_based">Zero-based</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`target-${goal.id}`}>Target</Label>
              <Input id={`target-${goal.id}`} disabled={!editing || goal.locked || !!goal.sharedGoalId} {...register("target")} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`weightage-${goal.id}`}>Weightage</Label>
              <Input id={`weightage-${goal.id}`} disabled={!editing || goal.locked} type="number" {...register("weightage")} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => setEditing(true)} disabled={isSubmitting || editing || goal.locked}>
              <Save className="h-4 w-4" aria-hidden="true" />
              <span className="ml-2">Edit draft</span>
            </Button>
            {toast ? <Toast message={toast} /> : null}
          </div>
        </form>
      </CardContent>
      <ConfirmationDialog
        open={confirmOpen}
        title="Delete draft goal"
        description="Delete this draft goal? This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          setConfirmOpen(false);
          try {
            const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Delete failed");
            if (toastApi) toastApi.show("Draft deleted", "success"); else setToast("Draft deleted");
            onDeleted(goal.id);
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            if (toastApi) toastApi.show(msg || "Delete failed", "error"); else setToast(msg || "Delete failed");
          }
        }}
      />
    </Card>
  );
}
