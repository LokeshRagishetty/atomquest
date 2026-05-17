"use client";

import { Progress } from "@/components/ui/progress";
import type { Goal } from "@/types/domain";

export function WeightageIndicator({ goals }: { goals: Goal[] }) {
  const total = goals.reduce((s, g) => s + g.weightage, 0);
  const percent = Math.max(0, Math.min(100, total));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Total weightage</div>
        <div className={`text-sm font-semibold ${percent === 100 ? "text-success" : "text-muted-foreground"}`}>{percent}%</div>
      </div>
      <Progress value={percent} className="h-3 rounded-md" />
    </div>
  );
}
