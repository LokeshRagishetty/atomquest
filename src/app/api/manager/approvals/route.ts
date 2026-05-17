/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { mapGoalRowToGoal } from "@/lib/mappers";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email/templates";

type EmployeeSummary = {
  id: string;
  name: string;
  email: string;
  department: string;
};

export const GET = withApiRoute("manager.approvals.list", async function GET(req: Request) {
  const auth = await requireApiAuth(["manager", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status") || "submitted";
  const requestedManagerId = url.searchParams.get("managerId");
  const managerId = auth.profile.role === "manager" ? auth.profile.id : requestedManagerId;

  let employeeQuery = (auth.supabase.from("users") as any).select("id,name,email,department,manager_id").eq("role", "employee");

  if (managerId) {
    employeeQuery = employeeQuery.eq("manager_id", managerId);
  }

  const { data: employees, error: employeeError } = await employeeQuery;

  if (employeeError) return NextResponse.json({ error: employeeError.message }, { status: 500 });

  const employeeIds = (employees || []).map((employee: { id: string }) => employee.id);
  if (employeeIds.length === 0) return NextResponse.json({ goals: [] });

  const { data: goals, error: goalError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .in("employee_id", employeeIds)
    .eq("status", status)
    .order("employee_id", { ascending: true });

  if (goalError) return NextResponse.json({ error: goalError.message }, { status: 500 });

  const employeeById = new Map<string, EmployeeSummary>(
    (employees || []).map((employee: EmployeeSummary) => [employee.id, employee]),
  );

  const rows = ((goals || []) as Array<Database["public"]["Tables"]["goals"]["Row"]>).map((goal) => ({
    ...mapGoalRowToGoal(goal),
    employee: employeeById.get(goal.employee_id) || null,
  }));

  return NextResponse.json({ goals: rows });
});

export const POST = withApiRoute("manager.approvals.bulk_action", async function POST(req: Request) {
  const auth = await requireApiAuth(["manager", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { action, goalIds, comment } = body as {
    action?: "approve" | "reject";
    goalIds?: string[];
    comment?: string;
  };

  if (!action || !goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
    return NextResponse.json({ error: "action and goalIds[] are required" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .in("id", goalIds)
    .eq("status", "submitted");

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing || existing.length !== goalIds.length) {
    return NextResponse.json({ error: "One or more submitted goals were not found." }, { status: 404 });
  }

  if (action === "approve") {
    const updateObj: Database["public"]["Tables"]["goals"]["Update"] = {
      status: "approved",
      locked: true,
      approved_by: auth.profile.id,
      approved_at: new Date().toISOString(),
      review_comment: comment ?? null,
    };

    const { data, error } = await (auth.supabase.from("goals") as any).update(updateObj).in("id", goalIds).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const logs = ((data || []) as Array<Database["public"]["Tables"]["goals"]["Row"]>).map((row) => ({
      user_id: auth.profile.id,
      action: "approve_goal",
      entity_type: "goal",
      entity_id: row.id,
      old_value: existing.find((goal: { id: string }) => goal.id === row.id) ?? null,
      new_value: row,
    }));

    if (logs.length > 0) {
      const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert(logs);
      if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // Send emails grouped by employee
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const goalUrl = `${origin}/employee/dashboard`;
    
    const employeeIds = [...new Set(existing.map((g: any) => g.employee_id))];
    const { data: employees } = await (auth.supabase.from("users") as any).select("id, email").in("id", employeeIds);
    
    if (employees) {
      for (const employee of employees) {
        if (!employee.email) continue;
        const employeeGoals = existing.filter((g: any) => g.employee_id === employee.id);
        const titles = employeeGoals.map((g: any) => g.title).join(", ");
        await sendEmail({
          to: employee.email,
          subject: "Goals Approved",
          html: emailTemplates.goalApproved(titles, goalUrl),
        });
      }
    }

    return NextResponse.json({ updated: data });
  }

  if (action === "reject") {
    if (!comment || comment.trim().length === 0) {
      return NextResponse.json({ error: "Rejection comment is required" }, { status: 400 });
    }

    const updateObj: Database["public"]["Tables"]["goals"]["Update"] = {
      status: "rejected",
      locked: false,
      review_comment: comment,
      approved_by: null,
      approved_at: null,
    };

    const { data, error } = await (auth.supabase.from("goals") as any).update(updateObj).in("id", goalIds).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const logs = ((data || []) as Array<Database["public"]["Tables"]["goals"]["Row"]>).map((row) => ({
      user_id: auth.profile.id,
      action: "reject_goal",
      entity_type: "goal",
      entity_id: row.id,
      old_value: existing.find((goal: { id: string }) => goal.id === row.id) ?? null,
      new_value: row,
    }));

    if (logs.length > 0) {
      const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert(logs);
      if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });
    }

    // Send emails grouped by employee
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const goalUrl = `${origin}/employee/dashboard`;
    
    const employeeIds = [...new Set(existing.map((g: any) => g.employee_id))];
    const { data: employees } = await (auth.supabase.from("users") as any).select("id, email").in("id", employeeIds);
    
    if (employees) {
      for (const employee of employees) {
        if (!employee.email) continue;
        const employeeGoals = existing.filter((g: any) => g.employee_id === employee.id);
        const titles = employeeGoals.map((g: any) => g.title).join(", ");
        await sendEmail({
          to: employee.email,
          subject: "Goals Require Revision",
          html: emailTemplates.goalRejected(titles, goalUrl),
        });
      }
    }

    return NextResponse.json({ updated: data });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
});
