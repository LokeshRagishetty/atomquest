/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { validateGoalPortfolio } from "@/lib/validation/goal";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email/templates";

export const POST = withApiRoute("goals.submit", async function POST(req: Request) {
  const auth = await requireApiAuth(["employee", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { employeeId: requestedEmployeeId, goalIds } = body as { employeeId?: string; goalIds?: string[] };
  const employeeId = auth.profile.role === "admin" && requestedEmployeeId ? requestedEmployeeId : auth.profile.id;

  if (!goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
    return NextResponse.json({ error: "goalIds[] are required" }, { status: 400 });
  }

  const { data: goals, error: fetchError } = await auth.supabase
    .from("goals")
    .select("*")
    .eq("employee_id", employeeId)
    .in("id", goalIds);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const goalRows = (goals || []) as Array<Database["public"]["Tables"]["goals"]["Row"]>;

  if (goalRows.length !== goalIds.length) {
    return NextResponse.json({ error: "One or more goals were not found." }, { status: 404 });
  }

  const validation = validateGoalPortfolio(goalRows as any);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.message }, { status: 400 });
  }

  const locked = goalRows.some((goal) => goal.locked && goal.status !== "submitted");
  if (locked) {
    return NextResponse.json({ error: "Locked goals cannot be submitted." }, { status: 400 });
  }

  const updatePayload: Database["public"]["Tables"]["goals"]["Update"] = {
    status: "submitted",
    locked: true,
  };

  const { data, error } = await (auth.supabase.from("goals") as any)
    .update(updatePayload)
    .eq("employee_id", employeeId)
    .in("id", goalIds)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const logs = (data || []).map((row: Database["public"]["Tables"]["goals"]["Row"]) => ({
    user_id: auth.profile.id,
    action: "submit_goal",
    entity_type: "goal",
    entity_id: row.id,
    old_value: goalRows.find((goal) => goal.id === row.id) ?? null,
    new_value: row,
  }));

  if (logs.length > 0) {
    const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert(logs);
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  // Send email to manager
  const { data: employeeData } = await (auth.supabase.from("users") as any)
    .select("name, manager_id")
    .eq("id", employeeId)
    .single();

  if (employeeData?.manager_id) {
    const { data: managerData } = await (auth.supabase.from("users") as any)
      .select("email")
      .eq("id", employeeData.manager_id)
      .single();

    if (managerData?.email) {
      const titles = goalRows.map((g) => g.title).join(", ");
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      
      await sendEmail({
        to: managerData.email,
        subject: `Goal Submission: ${employeeData.name}`,
        html: emailTemplates.goalSubmitted(employeeData.name, titles, `${origin}/manager/approvals`),
      });
    }
  }

  return NextResponse.json({ updated: data });
});
