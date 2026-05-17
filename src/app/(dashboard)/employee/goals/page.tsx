import { redirect } from "next/navigation";
import { GoalList } from "@/features/goals/components/goal-list";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";

export default async function MyGoalsPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "employee") redirect(roleHome[auth.data.profile.role]);

  return (
    <main className="page-shell">
      <GoalList />
    </main>
  );
}
