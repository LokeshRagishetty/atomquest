"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useToastSafe } from "@/components/ui/toast-provider";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { goalFormSchema, type GoalFormValues } from "@/lib/validation/goal";

const uomOptions = [
  { value: "numeric_min", label: "Numeric Min" },
  { value: "numeric_max", label: "Numeric Max" },
  { value: "percentage", label: "Percentage" },
  { value: "timeline", label: "Timeline" },
  { value: "zero_based", label: "Zero-based" },
];

export function GoalForm() {
  const [submittedGoal, setSubmittedGoal] = useState<GoalFormValues | null>(null);
  const { currentUser } = useAuth();
  const toast = useToastSafe();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
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

  const currentWeightage = watch("weightage");
  const weightageHint = useMemo(() => {
    const remaining = 100 - Number(currentWeightage || 0);
    return remaining >= 0 ? `${remaining}% remaining for other goals` : "Weightage exceeds total portfolio.";
  }, [currentWeightage]);

  async function onSubmit(values: GoalFormValues) {
    try {
      if (!currentUser) throw new Error("Not authenticated");

      const res = await fetch(`/api/goals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: values }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error || "Create failed");
      }

      toast?.show("Goal saved successfully", "success");
      setSubmittedGoal(values);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast?.show(msg || "Create failed", "error");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a goal draft</CardTitle>
        <CardDescription>
          Capture the goal details needed before submission to the L1 approval workflow.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-2">
            <Label htmlFor="thrustArea">Thrust Area</Label>
            <Input id="thrustArea" placeholder="Revenue Growth" {...register("thrustArea")} />
            {errors.thrustArea ? <p className="text-sm text-destructive">{errors.thrustArea.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input id="title" placeholder="Increase enterprise revenue" {...register("title")} />
            {errors.title ? <p className="text-sm text-destructive">{errors.title.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Describe the business outcome and scope of the goal."
              {...register("description")}
            />
            {errors.description ? <p className="text-sm text-destructive">{errors.description.message}</p> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="uomType">UoM Type</Label>
              <select
                id="uomType"
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
              <Label htmlFor="target">Target</Label>
              <Input id="target" placeholder="12000000" {...register("target")} />
              {errors.target ? <p className="text-sm text-destructive">{errors.target.message}</p> : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="weightage">Weightage</Label>
              <Input id="weightage" type="number" min={10} max={100} {...register("weightage")} />
              <p className="text-xs text-muted-foreground">{weightageHint}</p>
              {errors.weightage ? <p className="text-sm text-destructive">{errors.weightage.message}</p> : null}
            </div>
          </div>

          {submittedGoal ? (
            <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-600">
              Goal {submittedGoal.title} saved successfully.
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Draft"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
