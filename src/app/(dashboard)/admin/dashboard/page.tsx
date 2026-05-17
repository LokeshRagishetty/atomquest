import { redirect } from "next/navigation";
import { Activity, FileClock, ShieldCheck, UsersRound } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { KpiCard } from "@/features/dashboard/components/kpi-card";
import {
  DepartmentPerformanceChart,
  QoqTrendChart,
  ThrustAreaPieChart,
} from "@/features/dashboard/components/dashboard-charts";
import { average, buildDepartmentData, buildThrustAreaData, buildTrendData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { mapCheckinRowToCheckin, mapGoalRowToGoal } from "@/lib/mappers";

type UserRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "department">;

export default async function AdminDashboardPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "admin") redirect(roleHome[auth.data.profile.role]);

  const [
    { data: users, error: usersError },
    { data: goalRows, error: goalsError },
    { data: checkinRows, error: checkinsError },
    { count: auditCount, error: auditError },
  ] = await Promise.all([
    auth.data.supabase.from("users").select("id,name,email,role,department,manager_id"),
    auth.data.supabase.from("goals").select("*"),
    auth.data.supabase.from("checkins").select("*"),
    auth.data.supabase.from("audit_logs").select("id", { count: "exact", head: true }),
  ]);

  if (usersError) throw new Error(usersError.message);
  if (goalsError) throw new Error(goalsError.message);
  if (checkinsError) throw new Error(checkinsError.message);
  if (auditError) throw new Error(auditError.message);

  const goals = (goalRows || []).map(mapGoalRowToGoal);
  const checkins = (checkinRows || []).map(mapCheckinRowToCheckin);
  const userRows = (users || []) as UserRow[];
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const userById = new Map(userRows.map((user) => [user.id, user]));
  const completion = Math.round(average(checkins.map((checkin) => checkin.completionPercentage)));
  const departmentData = buildDepartmentData(
    checkins.map((checkin) => {
      const goal = goalById.get(checkin.goalId);
      const employee = goal ? userById.get(goal.employeeId) : null;

      return {
        department: employee?.department ?? "Unassigned",
        completionPercentage: checkin.completionPercentage,
      };
    }),
  );

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Admin Dashboard"
        title="Organization-wide governance"
        description="Oversee completion, departments, goal distribution, audit activity, and reporting readiness."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard title="Overall completion" value={`${completion}%`} description="Quarterly check-ins" tone="success" icon={<Activity />} />
        <KpiCard title="Active users" value={String(userRows.length)} description="Employees, managers, and admins" icon={<UsersRound />} />
        <KpiCard title="Audit events" value={String(auditCount ?? 0)} description="Tracked governance events" icon={<ShieldCheck />} />
        <KpiCard title="Delayed windows" value={String(checkins.filter((checkin) => checkin.progressStatus === "delayed").length)} description="Escalation candidates" tone="warning" icon={<FileClock />} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <DepartmentPerformanceChart data={departmentData} />
        <ThrustAreaPieChart data={buildThrustAreaData(goals)} />
        <QoqTrendChart data={buildTrendData(checkins)} />
        <ActivityFeed />
      </section>
    </main>
  );
}
