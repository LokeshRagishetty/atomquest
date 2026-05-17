import type { Checkin, Goal } from "@/types/domain";

export type TrendPoint = {
  quarter: string;
  employee: number;
  team: number;
  department: number;
};

export type PiePoint = {
  name: string;
  value: number;
};

export type DepartmentPoint = {
  department: string;
  completion: number;
};

export function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function buildTrendData(checkins: Checkin[]): TrendPoint[] {
  return ["q1", "q2", "q3", "q4"].map((quarter) => {
    const quarterAverage = Math.round(
      average(checkins.filter((checkin) => checkin.quarter === quarter).map((checkin) => checkin.completionPercentage)),
    );

    return {
      quarter: quarter.toUpperCase(),
      employee: quarterAverage,
      team: quarterAverage,
      department: quarterAverage,
    };
  });
}

export function buildThrustAreaData(goals: Goal[]): PiePoint[] {
  const grouped = new Map<string, number>();

  goals.forEach((goal) => {
    grouped.set(goal.thrustArea, (grouped.get(goal.thrustArea) ?? 0) + goal.weightage);
  });

  return Array.from(grouped, ([name, value]) => ({ name, value }));
}

export function buildDepartmentData(
  rows: Array<{
    department: string;
    completionPercentage: number;
  }>,
): DepartmentPoint[] {
  const grouped = new Map<string, number[]>();

  rows.forEach((row) => {
    const values = grouped.get(row.department) ?? [];
    values.push(row.completionPercentage);
    grouped.set(row.department, values);
  });

  return Array.from(grouped, ([department, values]) => ({
    department,
    completion: Math.round(average(values)),
  }));
}
