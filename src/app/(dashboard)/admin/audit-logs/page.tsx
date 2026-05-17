import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { PageHeader } from "@/components/layout/page-header";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";

export default async function AuditLogsPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "admin") redirect(roleHome[auth.data.profile.role]);

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Admin / HR"
        title="Audit Logs"
        description="Track goal edits, unlock actions, weightage changes, approvals, and rejections."
      />
      <Card>
        <CardHeader>
          <CardTitle>Governance activity</CardTitle>
          <CardDescription>Audit schema stores actor, entity, old value, new value, and timestamp.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityFeed />
        </CardContent>
      </Card>
    </main>
  );
}
