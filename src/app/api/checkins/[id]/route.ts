/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getRouteParam, withApiRoute } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import { calculateProgress } from "@/lib/calculate-progress";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email/templates";
import { syncSharedGoalCheckins } from "@/lib/shared-checkins";
import type { Database } from "@/lib/supabase/database.types";

type CheckinQuarter = Database["public"]["Tables"]["checkins"]["Row"]["quarter"];
type ProgressStatus = Database["public"]["Tables"]["checkins"]["Row"]["progress_status"];
type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

export const PUT = withApiRoute("checkins.update", async function PUT(req: Request, context: RouteContext) {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const body = await req.json();
  const { updates } = body as any;

  if (!updates) return NextResponse.json({ error: "updates are required" }, { status: 400 });

  const { data: existing, error: fetchError } = await (auth.supabase.from("checkins") as any)
    .select("*, goals:goal_id(*)")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });

  const updatePayload: Record<string, unknown> = {};

  if (typeof updates.achievement !== "undefined") {
    const progress = calculateProgress(existing.goals.uom_type, existing.goals.target, String(updates.achievement));
    updatePayload.achievement = String(updates.achievement);
    updatePayload.completion_percentage = progress.completionPercentage;
    updatePayload.progress_status = updates.progressStatus ?? updates.progress_status ?? progress.progressLabel;
  }

  if (typeof updates.progressStatus !== "undefined" || typeof updates.progress_status !== "undefined") {
    updatePayload.progress_status = updates.progressStatus ?? updates.progress_status;
  }

  if (auth.profile.role !== "employee" && typeof updates.managerComment !== "undefined") {
    updatePayload.manager_comment = updates.managerComment;
  }

  if (auth.profile.role !== "employee" && typeof updates.manager_comment !== "undefined") {
    updatePayload.manager_comment = updates.manager_comment;
  }

  if (Object.keys(updatePayload).length === 0) {
    return NextResponse.json({ error: "No supported check-in updates were provided." }, { status: 400 });
  }

  const { data, error } = await (auth.supabase.from("checkins") as any).update(updatePayload).eq("id", id).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: "update_checkin",
    entity_type: "checkin",
    entity_id: id,
    old_value: existing,
    new_value: data,
  });

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  const syncResult = await syncSharedGoalCheckins({
    supabase: auth.supabase,
    requesterRole: auth.profile.role,
    goal: existing.goals as GoalRow,
    quarter: existing.quarter as CheckinQuarter,
    achievement: String(updatePayload.achievement ?? existing.achievement),
    progressStatus: (updatePayload.progress_status ?? existing.progress_status) as ProgressStatus,
    managerComment: (updatePayload.manager_comment ?? existing.manager_comment ?? null) as string | null,
  });

  // Send email if manager added a comment
  if (
    auth.profile.role !== "employee" &&
    (typeof updates.managerComment !== "undefined" || typeof updates.manager_comment !== "undefined")
  ) {
    const { data: employeeData } = await (auth.supabase.from("users") as any)
      .select("email")
      .eq("id", existing.goals.employee_id)
      .single();

    if (employeeData?.email) {
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const goalUrl = `${origin}/employee/dashboard`;
      
      await sendEmail({
        to: employeeData.email,
        subject: "Check-in Reviewed",
        html: emailTemplates.checkInReminder(existing.goals.title, goalUrl),
      });
    }
  }

  return NextResponse.json({ checkin: data, sharedSync: syncResult });
});

export const DELETE = withApiRoute("checkins.delete", async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const { data, error } = await (auth.supabase.from("checkins") as any).delete().eq("id", id).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Check-in not found" }, { status: 404 });

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: "delete_checkin",
    entity_type: "checkin",
    entity_id: id,
    old_value: data,
    new_value: null,
  });

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  return NextResponse.json({ deleted: data });
});
