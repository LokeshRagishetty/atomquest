/* eslint-disable @typescript-eslint/no-explicit-any */
import { calculateProgress } from "@/lib/calculate-progress";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type CheckinRow = Database["public"]["Tables"]["checkins"]["Row"];
type CheckinInsert = Database["public"]["Tables"]["checkins"]["Insert"];
type ProgressStatus = CheckinRow["progress_status"];
type Quarter = CheckinRow["quarter"];
type UserRole = Database["public"]["Tables"]["users"]["Row"]["role"];

type SyncSharedGoalCheckinsOptions = {
  supabase: SupabaseServerClient;
  requesterRole: UserRole;
  goal: GoalRow;
  quarter: Quarter;
  achievement: string;
  progressStatus?: ProgressStatus;
  managerComment?: string | null;
};

export async function syncSharedGoalCheckins({
  supabase,
  requesterRole,
  goal,
  quarter,
  achievement,
  progressStatus,
  managerComment,
}: SyncSharedGoalCheckinsOptions) {
  if (!goal.shared_goal_id) {
    return { synced: 0, skipped: true };
  }

  const syncClient = (createSupabaseAdminClient() ?? (requesterRole === "employee" ? null : supabase)) as SupabaseServerClient | null;

  if (!syncClient) {
    return { synced: 0, skipped: true };
  }

  const { data: sharedGoals, error: goalsError } = await syncClient
    .from("goals")
    .select("*")
    .eq("shared_goal_id", goal.shared_goal_id);

  if (goalsError) {
    return { synced: 0, skipped: true, error: goalsError.message };
  }

  const sharedGoalRows = (sharedGoals || []) as GoalRow[];
  const sharedGoalIds = sharedGoalRows.map((sharedGoal) => sharedGoal.id);

  if (sharedGoalIds.length === 0) {
    return { synced: 0, skipped: true };
  }

  const { data: existingCheckins, error: existingError } = await syncClient
    .from("checkins")
    .select("*")
    .in("goal_id", sharedGoalIds)
    .eq("quarter", quarter);

  if (existingError) {
    return { synced: 0, skipped: true, error: existingError.message };
  }

  const existingByGoalId = new Map(
    ((existingCheckins || []) as CheckinRow[]).map((checkin) => [checkin.goal_id, checkin]),
  );

  const checkinRows: CheckinInsert[] = sharedGoalRows.map((sharedGoal) => {
    const progress = calculateProgress(sharedGoal.uom_type, sharedGoal.target, achievement);
    const existing = existingByGoalId.get(sharedGoal.id);

    return {
      goal_id: sharedGoal.id,
      quarter,
      achievement,
      progress_status: progressStatus ?? progress.progressLabel,
      manager_comment: requesterRole === "employee" ? existing?.manager_comment ?? null : managerComment ?? existing?.manager_comment ?? null,
      completion_percentage: progress.completionPercentage,
    };
  });

  const { error: upsertError } = await (syncClient.from("checkins") as any)
    .upsert(checkinRows, { onConflict: "goal_id,quarter" });

  if (upsertError) {
    return { synced: 0, skipped: true, error: upsertError.message };
  }

  return { synced: checkinRows.length, skipped: false };
}
