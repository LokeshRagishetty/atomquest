/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { calculateProgress } from "@/lib/calculate-progress";
import { syncSharedGoalCheckins } from "@/lib/shared-checkins";

type CheckinQuarter = Database["public"]["Tables"]["checkins"]["Row"]["quarter"];
type ProgressStatus = Database["public"]["Tables"]["checkins"]["Row"]["progress_status"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

export const GET = withApiRoute("checkins.list", async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const goalId = url.searchParams.get("goalId");
  const quarter = url.searchParams.get("quarter");

  if (!goalId || !quarter) {
    return NextResponse.json({ error: "goalId and quarter are required" }, { status: 400 });
  }

  const { data, error } = await (auth.supabase.from("checkins") as any)
    .select("*")
    .eq("goal_id", goalId)
    .eq("quarter", quarter);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ checkins: data });
});

export const POST = withApiRoute("checkins.upsert", async function POST(req: Request) {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { goalId, quarter, achievement, progressStatus, managerComment } = body as any;

  if (!goalId || !quarter || typeof achievement === "undefined") {
    return NextResponse.json({ error: "goalId, quarter and achievement are required" }, { status: 400 });
  }

  const { data: goal, error: goalError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .eq("id", goalId)
    .maybeSingle();

  if (goalError) return NextResponse.json({ error: goalError.message }, { status: 500 });
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const { data: existing, error: existingError } = await (auth.supabase.from("checkins") as any)
    .select("*")
    .eq("goal_id", goalId)
    .eq("quarter", quarter)
    .maybeSingle();

  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

  const progress = calculateProgress(goal.uom_type, goal.target, String(achievement));
  const insertObj: Database["public"]["Tables"]["checkins"]["Insert"] = {
    goal_id: goalId,
    quarter: quarter as CheckinQuarter,
    achievement: String(achievement),
    progress_status: (progressStatus ?? progress.progressLabel) as ProgressStatus,
    manager_comment: auth.profile.role === "employee" ? existing?.manager_comment ?? null : managerComment ?? null,
    completion_percentage: progress.completionPercentage,
  };

  const { data, error } = await (auth.supabase.from("checkins") as any)
    .upsert(insertObj, { onConflict: "goal_id,quarter" })
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: existing ? "update_checkin" : "create_checkin",
    entity_type: "checkin",
    entity_id: data.id,
    old_value: existing,
    new_value: data,
  });

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  const syncResult = await syncSharedGoalCheckins({
    supabase: auth.supabase,
    requesterRole: auth.profile.role,
    goal: goal as GoalRow,
    quarter: insertObj.quarter,
    achievement: insertObj.achievement,
    progressStatus: insertObj.progress_status,
    managerComment: insertObj.manager_comment,
  });

  return NextResponse.json({ checkin: data, sharedSync: syncResult });
});
