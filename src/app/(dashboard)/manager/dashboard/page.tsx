import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KPIStatCard } from "@/components/analytics/KPIStatCard";
import { ChartCard } from "@/components/analytics/ChartCard";
import { DepartmentPerformanceChart, QoqTrendChart } from "@/features/dashboard/components/dashboard-charts";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { average, buildDepartmentData, buildTrendData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { mapCheckinRowToCheckin, mapGoalRowToGoal } from "@/lib/mappers";
import { SharedGoalForm } from "@/features/goals/components/shared-goal-form";

type EmployeeRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "email" | "department">;

export default async function ManagerDashboardPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "manager") redirect(roleHome[auth.data.profile.role]);

  const { data: employees, error: employeesError } = await auth.data.supabase
    .from("users")
    .select("id,name,email,department")
    .eq("manager_id", auth.data.profile.id)
    .eq("role", "employee");

  if (employeesError) throw new Error(employeesError.message);

  const employeeRows = (employees || []) as EmployeeRow[];
  const employeeIds = employeeRows.map((employee) => employee.id);
  const { data: goalRows, error: goalsError } =
    employeeIds.length > 0
      ? await auth.data.supabase.from("goals").select("*").in("employee_id", employeeIds)
      : { data: [], error: null };

  if (goalsError) throw new Error(goalsError.message);

  const goals = (goalRows || []).map(mapGoalRowToGoal);
  const goalIds = goals.map((goal) => goal.id);
  const { data: checkinRows, error: checkinsError } =
    goalIds.length > 0
      ? await auth.data.supabase.from("checkins").select("*").in("goal_id", goalIds)
      : { data: [], error: null };

  if (checkinsError) throw new Error(checkinsError.message);

  const checkins = (checkinRows || []).map(mapCheckinRowToCheckin);
  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));
  const goalsByEmployee = new Map<string, typeof goals>();

  goals.forEach((goal) => {
    goalsByEmployee.set(goal.employeeId, [...(goalsByEmployee.get(goal.employeeId) ?? []), goal]);
  });

  const approvalRows = employeeRows.map((employee) => {
    const employeeGoals = goalsByEmployee.get(employee.id) ?? [];
    const statuses = new Set(employeeGoals.map((goal) => goal.status));
    const status = statuses.has("submitted") ? "Pending" : statuses.has("rejected") ? "Rework" : statuses.has("approved") ? "Approved" : "Draft";

    return {
      employee: employee.name,
      department: employee.department,
      goals: employeeGoals.length,
      weightage: `${employeeGoals.reduce((sum, goal) => sum + goal.weightage, 0)}%`,
      status,
    };
  });

  const departmentData = buildDepartmentData(
    checkins.map((checkin) => {
      const goal = goals.find((item) => item.id === checkin.goalId);
      const employee = goal ? employeeById.get(goal.employeeId) : null;

      return {
        department: employee?.department ?? "Unassigned",
        completionPercentage: checkin.completionPercentage,
      };
    }),
  );

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Manager Dashboard"
        title="Team approvals and check-in health"
        description="Monitor submitted goal sheets, completion windows, delayed check-ins, and team performance."
        actions={<SharedGoalForm assignees={employeeRows} />}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard title="Team members" subtitle={auth.data.profile.department} value={employeeRows.length} />
        <KPIStatCard title="Pending approvals" subtitle="Need manager action" value={goals.filter((goal) => goal.status === "submitted").length} tone="warning" />
        <KPIStatCard title="Average progress" subtitle="Current check-ins" value={Math.round(average(checkins.map((checkin) => checkin.completionPercentage)))} tone="success" />
        <KPIStatCard title="Delayed" subtitle="Outside active window" value={checkins.filter((checkin) => checkin.progressStatus === "delayed").length} tone="danger" />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
        <div>
          <ChartCard title="Approval queue snapshot" description="Goal sheets grouped by approval readiness">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Goals</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvalRows.map((row) => (
                  <TableRow key={row.employee}>
                    <TableCell className="font-medium">{row.employee}</TableCell>
                    <TableCell>{row.department}</TableCell>
                    <TableCell>{row.goals}</TableCell>
                    <TableCell>{row.weightage}</TableCell>
                    <TableCell>
                      <Badge variant={row.status === "Approved" ? "success" : row.status === "Pending" ? "warning" : "destructive"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ChartCard>

          <div className="mt-4">
            <DepartmentPerformanceChart data={departmentData} />
          </div>
        </div>

        <div className="space-y-4">
          <ActivityFeed />
        </div>
      </section>

      <section className="mt-6">
        <QoqTrendChart data={buildTrendData(checkins)} />
      </section>
    </main>
  );
}
