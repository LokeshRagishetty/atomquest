import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/layout/page-header";
import { QoqTrendChart, ThrustAreaPieChart } from "@/features/dashboard/components/dashboard-charts";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { ChartCard } from "@/components/analytics/ChartCard";
import { KPIStatCard } from "@/components/analytics/KPIStatCard";
import { CompletionDonut } from "@/components/analytics/CompletionDonut";
import { DashboardFilters } from "@/components/analytics/DashboardFilters";
import { buildThrustAreaData, buildTrendData, average } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import { mapCheckinRowToCheckin, mapGoalRowToGoal } from "@/lib/mappers";
import { validateGoalPortfolio } from "@/lib/validation/goal";

const statusVariant = {
  completed: "success",
  on_track: "warning",
  delayed: "destructive",
  not_started: "outline",
} as const;

export default async function EmployeeDashboardPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "employee") redirect(roleHome[auth.data.profile.role]);

  const { data: goalRows, error: goalsError } = await auth.data.supabase
    .from("goals")
    .select("*")
    .eq("employee_id", auth.data.profile.id)
    .order("created_at", { ascending: false });

  if (goalsError) throw new Error(goalsError.message);

  const goals = (goalRows || []).map(mapGoalRowToGoal);
  const goalIds = goals.map((goal) => goal.id);
  const { data: checkinRows, error: checkinsError } =
    goalIds.length > 0
      ? await auth.data.supabase.from("checkins").select("*").in("goal_id", goalIds)
      : { data: [], error: null };

  if (checkinsError) throw new Error(checkinsError.message);

  const checkins = (checkinRows || []).map(mapCheckinRowToCheckin);
  const checkinByGoalId = new Map(checkins.map((checkin) => [checkin.goalId, checkin]));
  const portfolioValidation = goals.length > 0 ? validateGoalPortfolio(goals) : { valid: false, message: "No goals created yet." };
  const averageProgress = Math.round(average(checkins.map((checkin) => checkin.completionPercentage)));

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Employee Dashboard"
        title="My goals and quarterly progress"
        description="Track approved goals, current check-ins, status movement, and portfolio validation in one view."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPIStatCard title="Approved goals" subtitle="Locked for review" value={goals.filter((goal) => goal.status === "approved").length} />
        <KPIStatCard title="Total weightage" subtitle={portfolioValidation.message} value={goals.reduce((sum, goal) => sum + goal.weightage, 0)} tone={portfolioValidation.valid ? "success" : "danger"} />
        <KPIStatCard title="Average progress" subtitle="Current check-ins" value={averageProgress} tone="warning" />
        <KPIStatCard title="Check-ins" subtitle="Goals with updates" value={checkins.length} />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Goal cards</CardTitle>
            <CardDescription>Goals with quarterly progress indicators.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? <p className="text-sm text-muted-foreground">No goals created yet.</p> : null}
            {goals.map((goal) => {
              const checkin = checkinByGoalId.get(goal.id);
              const progress = checkin?.completionPercentage ?? 0;
              const progressStatus = checkin?.progressStatus ?? "not_started";

              return (
                <article key={goal.id} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{goal.title}</h3>
                        <Badge variant={statusVariant[progressStatus]}>{progressStatus.replace("_", " ")}</Badge>
                        {goal.sharedGoalId ? <Badge variant="secondary">Shared Goal</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
                    </div>
                    <Badge variant="secondary">{goal.weightage}%</Badge>
                  </div>
                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-semibold">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                </article>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quarterly summary</CardTitle>
            <CardDescription>Latest check-in health and manager feedback.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checkins.length === 0 ? <p className="text-sm text-muted-foreground">No check-ins submitted yet.</p> : null}
            {checkins.map((checkin) => (
              <div key={checkin.id} className="flex gap-3 rounded-lg border p-3">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-semibold">{checkin.completionPercentage.toFixed(0)}% complete</p>
                  <p className="mt-1 text-sm text-muted-foreground">{checkin.managerComment ?? "No manager comment yet."}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Quarterly analytics</h3>
          <DashboardFilters />
        </div>
        <div className="mt-4 grid gap-6 lg:grid-cols-3 auto-rows-fr">
          <ChartCard title="Q-o-Q trend" description="Employee / Team / Department">
            <QoqTrendChart data={buildTrendData(checkins)} />
          </ChartCard>
          <ChartCard title="Completion" description="Overall completion">
            <CompletionDonut value={averageProgress} />
          </ChartCard>
          <ChartCard title="Goal distribution" description="Thrust area weightage">
            <ThrustAreaPieChart data={buildThrustAreaData(goals)} />
          </ChartCard>
        </div>
        <div className="mt-10 relative z-0">
  <ActivityFeed />
</div>
      </section>
    </main>
  );
}
