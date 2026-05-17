import type { Database } from "@/lib/supabase/database.types";
import type { AppUser, Checkin, Goal } from "@/types/domain";

export function mapUserRowToAppUser(row: Database["public"]["Tables"]["users"]["Row"]): AppUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    managerId: row.manager_id,
    department: row.department,
  };
}

export function mapGoalRowToGoal(row: Database["public"]["Tables"]["goals"]["Row"]): Goal {
  return {
    id: row.id,
    employeeId: row.employee_id,
    thrustArea: row.thrust_area,
    title: row.title,
    description: row.description,
    uomType: row.uom_type,
    target: row.target,
    weightage: row.weightage,
    status: row.status,
    locked: row.locked,
    sharedGoalId: row.shared_goal_id,
    reviewComment: row.review_comment,
  };
}

export function mapCheckinRowToCheckin(row: Database["public"]["Tables"]["checkins"]["Row"]): Checkin {
  return {
    id: row.id,
    goalId: row.goal_id,
    quarter: row.quarter,
    achievement: row.achievement,
    progressStatus: row.progress_status,
    managerComment: row.manager_comment,
    completionPercentage: Number(row.completion_percentage),
  };
}
