import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { UserManagement } from "@/features/admin/components/user-management";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";

export default async function UserManagementPage() {
  const auth = await getAuthContext();
  if (!auth.data) redirect("/login");
  if (auth.data.profile.role !== "admin") redirect(roleHome[auth.data.profile.role]);

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow="Admin / HR"
        title="User Management Console"
        description="Manage roles, departments, reporting lines, and access status."
      />
      <UserManagement />
    </main>
  );
}
