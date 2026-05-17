/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { mapGoalRowToGoal } from "@/lib/mappers";

export const GET = withApiRoute("goals.list", async function GET(req: Request) {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const requestedEmployeeId = url.searchParams.get("employeeId");

  let query = (auth.supabase.from("goals") as any).select("*").order("created_at", { ascending: false });

  if (auth.profile.role === "employee") {
    query = query.eq("employee_id", auth.profile.id);
  } else if (requestedEmployeeId) {
    query = query.eq("employee_id", requestedEmployeeId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data || []) as Array<Database["public"]["Tables"]["goals"]["Row"]>;

  return NextResponse.json({ goals: rows.map(mapGoalRowToGoal) });
});

export const POST = withApiRoute("goals.create", async function POST(req: Request) {
  const auth = await requireApiAuth(["employee", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { employeeId: requestedEmployeeId, goal } = body as { employeeId?: string; goal?: any };
  const employeeId = auth.profile.role === "admin" && requestedEmployeeId ? requestedEmployeeId : auth.profile.id;

  if (!goal) {
    return NextResponse.json({ error: "goal is required" }, { status: 400 });
  }

  if (typeof goal.weightage !== "number" || goal.weightage < 10) {
    return NextResponse.json({ error: "Each goal must have a minimum weightage of 10%" }, { status: 400 });
  }

  const { data: existingGoals, error: fetchError } = await (auth.supabase.from("goals") as any)
    .select("id, weightage, status")
    .eq("employee_id", employeeId)
    .in("status", ["draft", "submitted", "approved"]);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const existing = (existingGoals || []) as Array<Pick<Database["public"]["Tables"]["goals"]["Row"], "weightage">>;
  if (existing.length >= 8) {
    return NextResponse.json({ error: "An employee can have a maximum of 8 goals." }, { status: 400 });
  }

  const totalAfter = existing.reduce((sum, row) => sum + (row.weightage || 0), 0) + goal.weightage;
  if (totalAfter > 100) {
    return NextResponse.json({ error: "Total goal weightage cannot exceed 100%." }, { status: 400 });
  }

  const insertPayload: Database["public"]["Tables"]["goals"]["Insert"] = {
    employee_id: employeeId,
    thrust_area: goal.thrustArea,
    title: goal.title,
    description: goal.description,
    uom_type: goal.uomType,
    target: goal.target,
    weightage: goal.weightage,
    status: "draft",
    locked: false,
    shared_goal_id: goal.sharedGoalId ?? null,
  };

  const { data, error } = await (auth.supabase.from("goals") as any).insert(insertPayload).select().maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: "create_goal",
    entity_type: "goal",
    entity_id: data.id,
    old_value: null,
    new_value: data,
  });

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({ goal: mapGoalRowToGoal(data as Database["public"]["Tables"]["goals"]["Row"]) });
});
