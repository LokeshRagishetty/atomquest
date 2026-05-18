import { z } from "zod";
import type { Goal } from "@/types/domain";

export const goalFormSchema = z.object({
  thrustArea: z.string().min(2, "Thrust area is required."),
  title: z.string().min(3, "Goal title is required."),
  description: z.string().min(10, "Description must explain the goal clearly."),
  uomType: z.enum(["numeric_min", "numeric_max", "percentage", "timeline", "zero_based"]),
  target: z.string().min(1, "Target is required."),
  weightage: z.coerce
    .number()
    .int("Weightage must be a whole number.")
    .min(10, "Minimum weightage per goal is 10%.")
    .max(100, "Weightage cannot exceed 100%."),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

export const sharedGoalPayloadSchema = z.object({
  employeeIds: z.array(z.string().uuid()).min(1, "Select at least one employee."),
  goal: goalFormSchema,
});

export type SharedGoalPayload = z.infer<typeof sharedGoalPayloadSchema>;

export function validateGoalPortfolio(goals: Array<Pick<Goal, "weightage">>) {
  if (goals.length > 8) {
    return {
      valid: false,
      message: "An employee can have a maximum of 8 goals.",
    };
  }

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);

  if (totalWeightage !== 100) {
    return {
      valid: false,
      message: "Total goal weightage must equal exactly 100%.",
    };
  }

  return {
    valid: true,
    message: "Goal portfolio is valid.",
  };
}

export function calculateProgressPercentage({
  uomType,
  target,
  achievement,
}: {
  uomType: Goal["uomType"];
  target: string;
  achievement: string;
}) {
  if (uomType === "zero_based") {
    return Number(achievement) === 0 ? 100 : 0;
  }

  if (uomType === "timeline") {
    const deadline = new Date(target).getTime();
    const completionDate = new Date(achievement).getTime();

    if (Number.isNaN(deadline) || Number.isNaN(completionDate)) {
      return 0;
    }

    return completionDate <= deadline ? 100 : 0;
  }

  const numericTarget = Number(target);
  const numericAchievement = Number(achievement);

  if (!numericTarget || !numericAchievement) {
    return 0;
  }

  const rawScore =
    uomType === "numeric_max" ? numericTarget / numericAchievement : numericAchievement / numericTarget;

  return Math.max(0, Math.min(100, Number((rawScore * 100).toFixed(2))));
}
