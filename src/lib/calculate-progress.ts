import type { Goal } from "@/types/domain";

export type ProgressResult = {
  completionPercentage: number;
  progressLabel: "not_started" | "on_track" | "completed" | "delayed";
  color: string;
};

export function calculateProgress(uomType: Goal["uomType"], target: string, achievement: string): ProgressResult {
  if (uomType === "zero_based") {
    const completion = Number(achievement) === 0 ? 100 : 0;
    return {
      completionPercentage: completion,
      progressLabel: completion === 100 ? "completed" : "not_started",
      color: completion === 100 ? "green" : "gray",
    };
  }

  if (uomType === "timeline") {
    const deadline = new Date(target).getTime();
    const completionDate = new Date(achievement).getTime();

    if (Number.isNaN(deadline) || Number.isNaN(completionDate)) {
      return { completionPercentage: 0, progressLabel: "not_started", color: "gray" };
    }

    const done = completionDate <= deadline;
    return {
      completionPercentage: done ? 100 : 0,
      progressLabel: done ? "completed" : "delayed",
      color: done ? "green" : "red",
    };
  }

  const numericTarget = Number(target);
  const numericAchievement = Number(achievement);

  if (!numericTarget || !numericAchievement) {
    return { completionPercentage: 0, progressLabel: "not_started", color: "gray" };
  }

  let rawScore = 0;
  if (uomType === "numeric_max") {
    rawScore = numericTarget / numericAchievement;
  } else {
    // numeric_min or percentage
    rawScore = numericAchievement / numericTarget;
  }

  const pct = Math.max(0, Math.min(100, Number((rawScore * 100).toFixed(2))));
  const label: ProgressResult["progressLabel"] = pct >= 100 ? "completed" : pct > 0 ? "on_track" : "not_started";
  const color = pct >= 100 ? "green" : pct > 0 ? "blue" : "gray";

  return { completionPercentage: pct, progressLabel: label, color };
}
