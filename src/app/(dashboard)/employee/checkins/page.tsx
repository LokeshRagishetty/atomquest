import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { Progress } from "@/components/ui/progress";
import { CheckinList } from "@/features/checkins/checkin-list";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import { mapCheckinRowToCheckin, mapGoalRowToGoal } from "@/lib/mappers";

export default async function EmployeeCheckinsPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "employee") redirect(roleHome[auth.data.profile.role]);

  const { data: goalRows, error: goalsError } = await auth.data.supabase
    .from("goals")
    .select("*")
    .eq("employee_id", auth.data.profile.id)
    .in("status", ["approved", "submitted"])
    .order("created_at", { ascending: false });

  if (goalsError) throw new Error(goalsError.message);

  const goals = (goalRows || []).map(mapGoalRowToGoal);
  const goalIds = goals.map((goal) => goal.id);
  const { data: checkinRows, error: checkinsError } =
    goalIds.length > 0
      ? await auth.data.supabase.from("checkins").select("*").in("goal_id", goalIds).eq("quarter", "q1")
      : { data: [], error: null };

  if (checkinsError) throw new Error(checkinsError.message);

  const checkinByGoalId = new Map((checkinRows || []).map(mapCheckinRowToCheckin).map((checkin) => [checkin.goalId, checkin]));

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Employee"
        title="Quarterly Check-ins"
        description="Update actual achievement, goal status, and quarterly progress against planned targets."
      />
      <div className="grid gap-4">
        {goals.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Approved or submitted goals will appear here.</CardContent>
          </Card>
        ) : null}
        {goals.map((goal) => {
          const checkin = checkinByGoalId.get(goal.id);
          const progress = checkin?.completionPercentage ?? 0;
          const status = checkin?.progressStatus ?? "not_started";

          return (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle>{goal.title}</CardTitle>
                    <CardDescription>{goal.description}</CardDescription>
                  </div>
                  <Badge variant={status === "delayed" ? "destructive" : status === "completed" ? "success" : "warning"}>
                    {status.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-5 lg:grid-cols-[1fr_320px]">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Q1 completion</span>
                    <span className="font-semibold">{progress.toFixed(0)}%</span>
                  </div>
                  <Progress value={progress} />
                  <p className="mt-3 text-sm text-muted-foreground">
                    Manager comment: {checkin?.managerComment ?? "No manager comment yet."}
                  </p>
                </div>
                <CheckinList goalId={goal.id} quarter="q1" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
