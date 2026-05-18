"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UsersRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastSafe } from "@/components/ui/toast-provider";
import { goalFormSchema, type GoalFormValues } from "@/lib/validation/goal";

export type SharedGoalAssignee = {
  id: string;
  name: string;
  email: string;
  department: string;
};

const uomOptions = [
  { value: "numeric_min", label: "Numeric Min" },
  { value: "numeric_max", label: "Numeric Max" },
  { value: "percentage", label: "Percentage" },
  { value: "timeline", label: "Timeline" },
  { value: "zero_based", label: "Zero-based" },
] satisfies Array<{ value: GoalFormValues["uomType"]; label: string }>;

export function SharedGoalForm({ assignees }: { assignees: SharedGoalAssignee[] }) {
  const router = useRouter();
  const toast = useToastSafe();
  const [open, setOpen] = useState(false);
const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
const [submitting, setSubmitting] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      thrustArea: "",
      title: "",
      description: "",
      uomType: "numeric_min",
      target: "",
      weightage: 10,
    },
  });

  const selectedCount = selectedEmployeeIds.length;
  const currentWeightage = watch("weightage");
  const weightageHint = useMemo(() => {
    const remaining = 100 - Number(currentWeightage || 0);
    return remaining >= 0 ? `${remaining}% remaining` : "Weightage exceeds total.";
  }, [currentWeightage]);

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

async function onSubmit(values: GoalFormValues) {
  if (selectedEmployeeIds.length === 0) {
    toast?.show("Select at least one employee.", "error");
    return;
  }

  try {

  setSubmitError(null);

  setSubmitting(true);

    const res = await fetch("/api/goals/shared", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeIds: selectedEmployeeIds,
        goal: values,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(
        json?.error || "Shared goal creation failed",
      );
    }

    toast?.show(
      `Shared goal created for ${selectedEmployeeIds.length} employee${
        selectedEmployeeIds.length === 1 ? "" : "s"
      }.`,
      "success",
    );

    reset();

    setSelectedEmployeeIds([]);

    setOpen(false);

    router.refresh();
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "Shared goal creation failed";

  setSubmitError(message);

  toast?.show(message, "error");
} finally {
    setSubmitting(false);
  }
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create Shared Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Shared Goal</DialogTitle>
        </DialogHeader>
        <form
  key={open ? "shared-goal-open" : "shared-goal-closed"}
  className="grid gap-5"
  onSubmit={handleSubmit(onSubmit)}
>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="shared-goal-title">Goal Title</Label>
              <Input id="shared-goal-title" {...register("title")} />
              {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shared-goal-thrust">Thrust Area</Label>
              <Input id="shared-goal-thrust" {...register("thrustArea")} />
              {errors.thrustArea ? <p className="text-sm text-destructive">{errors.thrustArea.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="shared-goal-description">Description</Label>
            <textarea
              id="shared-goal-description"
              className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register("description")}
            />
            {errors.description ? <p className="text-sm text-destructive">{errors.description.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="shared-goal-target">Target</Label>
              <Input id="shared-goal-target" {...register("target")} />
              {errors.target ? <p className="text-sm text-destructive">{errors.target.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shared-goal-uom">UoM Type</Label>
              <select
                id="shared-goal-uom"
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("uomType")}
              >
                {uomOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="shared-goal-weightage">Weightage</Label>
              <Input id="shared-goal-weightage" type="number" min={10} max={100} {...register("weightage")} />
              <p className="text-xs text-muted-foreground">{weightageHint}</p>
              {errors.weightage ? <p className="text-sm text-destructive">{errors.weightage.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Label>Employee Multi-select</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedEmployeeIds(selectedCount === assignees.length ? [] : assignees.map((employee) => employee.id))}
                disabled={assignees.length === 0}
              >
                <UsersRound className="h-4 w-4" aria-hidden="true" />
                {selectedCount === assignees.length && assignees.length > 0 ? "Clear" : "Select all"}
              </Button>
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border bg-background">
              {assignees.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">No employees available.</div>
              ) : (
                assignees.map((employee) => (
                  <label
                    key={employee.id}
                    className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-accent/10"
                  >
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onChange={() => toggleEmployee(employee.id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{employee.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {employee.department} - {employee.email}
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
{submitError ? (
  <p className="text-sm text-destructive">
    {submitError}
  </p>
) : null}
         <Button
  type="submit"
  disabled={
    submitting ||
    selectedEmployeeIds.length === 0 ||
    assignees.length === 0
  }
>
  {submitting ? "Creating..." : "Create Shared Goal"}
</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
