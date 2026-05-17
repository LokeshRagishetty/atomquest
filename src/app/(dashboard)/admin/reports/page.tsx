import { redirect } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExportButtons } from "@/features/reports/components/export-buttons";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { mapCheckinRowToCheckin, mapGoalRowToGoal } from "@/lib/mappers";

type UserRow = Pick<Database["public"]["Tables"]["users"]["Row"], "id" | "name" | "email" | "department">;

export default async function ReportsPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "admin") redirect(roleHome[auth.data.profile.role]);

  const [
    { data: users, error: usersError },
    { data: goalRows, error: goalsError },
    { data: checkinRows, error: checkinsError },
  ] = await Promise.all([
    auth.data.supabase.from("users").select("id,name,email,department"),
    auth.data.supabase.from("goals").select("*").order("created_at", { ascending: false }),
    auth.data.supabase.from("checkins").select("*").eq("quarter", "q1"),
  ]);

  if (usersError) throw new Error(usersError.message);
  if (goalsError) throw new Error(goalsError.message);
  if (checkinsError) throw new Error(checkinsError.message);

  const userRows = (users || []) as UserRow[];
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const checkinsByGoalId = new Map((checkinRows || []).map(mapCheckinRowToCheckin).map((checkin) => [checkin.goalId, checkin]));
  const goals = (goalRows || []).map(mapGoalRowToGoal);

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Admin / HR"
        title="Reports"
        description="Export achievement reports showing planned targets versus actual achievement."
        actions={<ExportButtons />}
      />
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Achievement report preview</CardTitle>
              <CardDescription>Q1 export dataset for the current goal cycle.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Planned Target</TableHead>
                <TableHead>Actual Achievement</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {goals.map((goal) => {
                const employee = usersById.get(goal.employeeId);
                const checkin = checkinsByGoalId.get(goal.id);

                return (
                  <TableRow key={goal.id}>
                    <TableCell>{employee?.name ?? "Unknown"}</TableCell>
                    <TableCell className="font-medium">{goal.title}</TableCell>
                    <TableCell>{goal.target}</TableCell>
                    <TableCell>{checkin?.achievement ?? "Pending"}</TableCell>
                    <TableCell>{checkin ? `${checkin.completionPercentage.toFixed(0)}%` : "0%"}</TableCell>
                    <TableCell>{checkin?.progressStatus.replace("_", " ") ?? "not started"}</TableCell>
                  </TableRow>
                );
              })}
              {goals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No goals found.
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
