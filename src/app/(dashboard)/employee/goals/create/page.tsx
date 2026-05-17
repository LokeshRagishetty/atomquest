import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { GoalForm } from "@/features/goals/components/goal-form";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";

export default async function CreateGoalsPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "employee") redirect(roleHome[auth.data.profile.role]);

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Employee"
        title="Create Goals"
        description="Draft goal sheets with thrust area, UoM type, target, and validated weightage."
      />
      <GoalForm />
    </main>
  );
}
