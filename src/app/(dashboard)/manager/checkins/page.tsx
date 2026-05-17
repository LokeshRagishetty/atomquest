import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { mapCheckinRowToCheckin, mapGoalRowToGoal } from "@/lib/mappers";

type EmployeeRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "email" | "department">;

export default async function TeamCheckinsPage() {
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
      ? await auth.data.supabase.from("checkins").select("*").in("goal_id", goalIds).order("created_at", { ascending: false })
      : { data: [], error: null };

  if (checkinsError) throw new Error(checkinsError.message);

  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));
  const goalById = new Map(goals.map((goal) => [goal.id, goal]));
  const rows = (checkinRows || []).map(mapCheckinRowToCheckin).map((checkin) => {
    const goal = goalById.get(checkin.goalId);
    const employee = goal ? employeeById.get(goal.employeeId) : null;

    return { checkin, goal, employee };
  });

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Manager"
        title="Team Check-ins"
        description="Review planned versus achievement data and add structured manager comments."
      />
      <Card>
        <CardHeader>
          <CardTitle>Quarterly review queue</CardTitle>
          <CardDescription>Delayed check-ins are highlighted for timely follow-up.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Quarter</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Manager Follow-up</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ checkin, goal, employee }) => (
                <TableRow key={checkin.id}>
                  <TableCell className="font-medium">{employee?.name ?? "Unknown"}</TableCell>
                  <TableCell>{goal?.title ?? "Unknown goal"}</TableCell>
                  <TableCell>{checkin.quarter.toUpperCase()}</TableCell>
                  <TableCell className="min-w-48">
                    <div className="flex items-center gap-3">
                      <Progress value={checkin.completionPercentage} />
                      <span className="w-10 text-right text-sm font-semibold">{checkin.completionPercentage.toFixed(0)}%</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        checkin.progressStatus === "completed"
                          ? "success"
                          : checkin.progressStatus === "delayed"
                            ? "destructive"
                            : "warning"
                      }
                    >
                      {checkin.progressStatus.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {checkin.managerComment ? "Review captured" : "Comment required"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No team check-ins yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
