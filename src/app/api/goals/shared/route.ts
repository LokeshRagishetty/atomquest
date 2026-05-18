/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import { mapGoalRowToGoal } from "@/lib/mappers";
import type { Database } from "@/lib/supabase/database.types";
import { sharedGoalPayloadSchema } from "@/lib/validation/goal";

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];
type GoalInsert = Database["public"]["Tables"]["goals"]["Insert"];
type SharedGoalInsert = Database["public"]["Tables"]["shared_goals"]["Insert"];
type EmployeeRow = Pick<
  Database["public"]["Tables"]["users"]["Row"],
  "id" | "name" | "department" | "manager_id" | "role" | "is_active"
>;
type ExistingGoalRow = Pick<GoalRow, "employee_id" | "weightage" | "status">;

export const POST = withApiRoute("goals.shared.create", async function POST(req: Request) {
  const auth = await requireApiAuth(["manager", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const parsed = sharedGoalPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid shared goal payload." }, { status: 400 });
  }

  const employeeIds = Array.from(new Set(parsed.data.employeeIds));
  const { goal } = parsed.data;

  let employeeQuery = auth.supabase
    .from("users")
    .select("id,name,department,manager_id,role,is_active")
    .in("id", employeeIds)
    .eq("role", "employee")
    .eq("is_active", true);

  if (auth.profile.role === "manager") {
    employeeQuery = employeeQuery.eq("manager_id", auth.profile.id);
  }

  const { data: employees, error: employeeError } = await employeeQuery;

  if (employeeError) {
    return NextResponse.json({ error: employeeError.message }, { status: 500 });
  }

  const employeeRows = (employees || []) as EmployeeRow[];

  if (employeeRows.length !== employeeIds.length) {
    return NextResponse.json(
      { error: auth.profile.role === "manager" ? "Shared goals can only be assigned to active direct reports." : "One or more selected employees were not found." },
      { status: 403 },
    );
  }

  const { data: existingGoals, error: existingGoalsError } = await auth.supabase
    .from("goals")
    .select("employee_id,weightage,status")
    .in("employee_id", employeeIds)
    .in("status", ["draft", "submitted", "approved"]);

  if (existingGoalsError) {
    return NextResponse.json({ error: existingGoalsError.message }, { status: 500 });
  }

  const goalsByEmployee = new Map<string, ExistingGoalRow[]>();
  ((existingGoals || []) as ExistingGoalRow[]).forEach((row) => {
    goalsByEmployee.set(row.employee_id, [...(goalsByEmployee.get(row.employee_id) ?? []), row]);
  });

  for (const employee of employeeRows) {
    const employeeGoals = goalsByEmployee.get(employee.id) ?? [];
    const totalAfter = employeeGoals.reduce((sum, row) => sum + (row.weightage || 0), 0) + goal.weightage;

    if (employeeGoals.length >= 8) {
      return NextResponse.json({ error: `${employee.name} already has the maximum of 8 active goals.` }, { status: 400 });
    }

    if (totalAfter > 100) {
      return NextResponse.json({ error: `${employee.name}'s total goal weightage would exceed 100%.` }, { status: 400 });
    }
  }

  const sharedGoalId = crypto.randomUUID();
  const departments = Array.from(new Set(employeeRows.map((employee) => employee.department).filter(Boolean)));
  const assignedDepartment = departments.length === 1 ? departments[0] : "Multiple departments";
  const sharedGoalPayload: SharedGoalInsert = {
    id: sharedGoalId,
    title: goal.title,
    description: goal.description,
    target: goal.target,
    assigned_department: assignedDepartment,
    created_by: auth.profile.id,
  };

  const { error: sharedGoalError } = await (auth.supabase.from("shared_goals") as any).insert(sharedGoalPayload);

  if (sharedGoalError) {
    return NextResponse.json({ error: sharedGoalError.message }, { status: 500 });
  }

  const goalRows: GoalInsert[] = employeeRows.map((employee) => ({
    employee_id: employee.id,
    thrust_area: goal.thrustArea,
    title: goal.title,
    description: goal.description,
    uom_type: goal.uomType,
    target: goal.target,
    weightage: goal.weightage,
    status: "submitted",
    locked: true,
    shared_goal_id: sharedGoalId,
  }));

  const { data: insertedGoals, error: goalInsertError } = await (auth.supabase.from("goals") as any)
    .insert(goalRows)
    .select();

  if (goalInsertError) {
    await (auth.supabase.from("shared_goals") as any).delete().eq("id", sharedGoalId);
    return NextResponse.json({ error: goalInsertError.message }, { status: 500 });
  }

  const insertedGoalRows = (insertedGoals || []) as GoalRow[];
  const logs = insertedGoalRows.map((row) => ({
    user_id: auth.profile.id,
    action: "create_shared_goal",
    entity_type: "goal",
    entity_id: row.id,
    old_value: null,
    new_value: row,
  }));

  if (logs.length > 0) {
    const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert(logs);
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({
    sharedGoalId,
    goals: insertedGoalRows.map(mapGoalRowToGoal),
  });
});
