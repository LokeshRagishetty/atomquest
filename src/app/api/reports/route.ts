/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { logger } from "@/lib/logger";

const CSV_HEADERS = [
  "goalId",
  "title",
  "thrustArea",
  "employee",
  "department",
  "target",
  "weightage",
  "status",
  "achievement",
  "completionPercentage",
];

type EmployeeRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "email" | "department" | "manager_id">;

export const GET = withApiRoute("reports.export", async function GET(req: Request) {
  const auth = await requireApiAuth(["manager", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";
  const quarter = url.searchParams.get("quarter");
  const department = url.searchParams.get("department");
  const requestedManagerId = url.searchParams.get("managerId");
  const managerId = auth.profile.role === "manager" ? auth.profile.id : requestedManagerId;

  let usersQuery = (auth.supabase.from("users") as any).select("id,name,email,department,manager_id").eq("role", "employee");

  if (department) usersQuery = usersQuery.eq("department", department);
  if (managerId) usersQuery = usersQuery.eq("manager_id", managerId);

  const { data: employees, error: employeesError } = await usersQuery;
  if (employeesError) {
    logger.error("export.users_query_failed", employeesError, { format, quarter, department, managerId });
    return NextResponse.json({ error: employeesError.message }, { status: 500 });
  }

  const employeeRows = (employees || []) as EmployeeRow[];
  const employeeIds = employeeRows.map((employee) => employee.id);
  if (employeeIds.length === 0) {
    const emptyCsv = `${CSV_HEADERS.join(",")}\n`;
    return format === "csv" ? new NextResponse(emptyCsv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8" } }) : NextResponse.json({ rows: [] });
  }

  const { data: goals, error: goalsError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .in("employee_id", employeeIds)
    .order("created_at", { ascending: false });

  if (goalsError) {
    logger.error("export.goals_query_failed", goalsError, { format, quarter, department, managerId });
    return NextResponse.json({ error: goalsError.message }, { status: 500 });
  }

  const goalIds = (goals || []).map((goal: { id: string }) => goal.id);
  let checkins: Array<Database["public"]["Tables"]["checkins"]["Row"]> = [];

  if (goalIds.length > 0 && quarter) {
    const { data: checkinData, error: checkinsError } = await (auth.supabase.from("checkins") as any)
      .select("*")
      .in("goal_id", goalIds)
      .eq("quarter", quarter);

    if (checkinsError) {
      logger.error("export.checkins_query_failed", checkinsError, { format, quarter, department, managerId });
      return NextResponse.json({ error: checkinsError.message }, { status: 500 });
    }
    checkins = checkinData || [];
  }

  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));
  const checkinByGoalId = new Map(checkins.map((checkin) => [checkin.goal_id, checkin]));
  const rows = ((goals || []) as Array<Database["public"]["Tables"]["goals"]["Row"]>).map((goal) => {
    const employee = employeeById.get(goal.employee_id);
    const checkin = checkinByGoalId.get(goal.id);

    return {
      goalId: goal.id,
      title: goal.title,
      thrustArea: goal.thrust_area,
      employee: employee?.name ?? "",
      department: employee?.department ?? "",
      target: goal.target,
      weightage: goal.weightage,
      status: goal.status,
      achievement: checkin?.achievement ?? "",
      completionPercentage: checkin?.completion_percentage ?? 0,
    };
  });

  if (format === "csv") {
    const csv = [
      CSV_HEADERS.join(","),
      ...rows.map((row) => CSV_HEADERS.map((header) => `"${String(row[header as keyof typeof row] ?? "").replaceAll('"', '""')}"`).join(",")),
    ].join("\n");

    return new NextResponse(csv, { status: 200, headers: { "Content-Type": "text/csv; charset=utf-8" } });
  }

  return NextResponse.json({ rows });
});
