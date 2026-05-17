import { redirect } from "next/navigation";
import { ApprovalQueue } from "@/features/manager/approval-queue";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";

export default async function ApprovalQueuePage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "manager") redirect(roleHome[auth.data.profile.role]);

  return (
    <main className="page-shell">
      <ApprovalQueue />
    </main>
  );
}
