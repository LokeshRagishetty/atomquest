/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getRouteParam, withApiRoute } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { mapGoalRowToGoal } from "@/lib/mappers";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email/templates";

export const PATCH = withApiRoute("manager.approvals.update", async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireApiAuth(["manager", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const body = await req.json();
  const { updates } = body as { updates?: any };

  if (!updates) return NextResponse.json({ error: "updates are required" }, { status: 400 });
  if (updates.status === "rejected" && !updates.review_comment?.trim()) {
    return NextResponse.json({ error: "Rejection comment is required" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const updateObj: Database["public"]["Tables"]["goals"]["Update"] = {};

  if (typeof updates.weightage !== "undefined") updateObj.weightage = updates.weightage;
  if (typeof updates.target !== "undefined") updateObj.target = updates.target;
  if (typeof updates.review_comment !== "undefined") updateObj.review_comment = updates.review_comment;

  if (updates.status === "approved") {
    updateObj.status = "approved";
    updateObj.locked = true;
    updateObj.approved_by = auth.profile.id;
    updateObj.approved_at = new Date().toISOString();
  }

  if (updates.status === "rejected") {
    updateObj.status = "rejected";
    updateObj.locked = Boolean(existing.shared_goal_id);
    updateObj.approved_by = null;
    updateObj.approved_at = null;
  }

  if (Object.keys(updateObj).length === 0) {
    return NextResponse.json({ error: "No supported approval updates were provided." }, { status: 400 });
  }

  const { data, error } = await (auth.supabase.from("goals") as any).update(updateObj).eq("id", id).select().maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: updates.status === "approved" ? "approve_goal" : updates.status === "rejected" ? "reject_goal" : "manager_inline_edit",
    entity_type: "goal",
    entity_id: id,
    old_value: existing,
    new_value: data,
  });

  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  // Send email to employee
  if (updates.status === "approved" || updates.status === "rejected") {
    const { data: employeeData } = await (auth.supabase.from("users") as any)
      .select("email")
      .eq("id", existing.employee_id)
      .single();

    if (employeeData?.email) {
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const goalUrl = `${origin}/employee/dashboard`;
      
      if (updates.status === "approved") {
        await sendEmail({
          to: employeeData.email,
          subject: "Goal Approved",
          html: emailTemplates.goalApproved(existing.title, goalUrl),
        });
      } else {
        await sendEmail({
          to: employeeData.email,
          subject: "Goal Requires Revision",
          html: emailTemplates.goalRejected(existing.title, goalUrl),
        });
      }
    }
  }

  return NextResponse.json({
    goal: data ? { ...mapGoalRowToGoal(data as Database["public"]["Tables"]["goals"]["Row"]), employee: null } : null,
  });
});
