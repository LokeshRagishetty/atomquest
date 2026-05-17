export type UserRole = "employee" | "manager" | "admin";

export type UomType = "numeric_min" | "numeric_max" | "percentage" | "timeline" | "zero_based";

export type GoalStatus = "draft" | "submitted" | "approved" | "rejected";

export type Quarter = "q1" | "q2" | "q3" | "q4";

export type ProgressStatus = "not_started" | "on_track" | "completed" | "delayed";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  managerId: string | null;
  department: string;
};

export type Goal = {
  id: string;
  employeeId: string;
  thrustArea: string;
  title: string;
  description: string;
  uomType: UomType;
  target: string;
  weightage: number;
  status: GoalStatus;
  locked: boolean;
  sharedGoalId: string | null;
  reviewComment: string | null;
};

export type Checkin = {
  id: string;
  goalId: string;
  quarter: Quarter;
  achievement: string;
  progressStatus: ProgressStatus;
  managerComment: string | null;
  completionPercentage: number;
};
