import {
  ClipboardCheck,
  FileBarChart,
  FileClock,
  Home,
  ListChecks,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { UserRole } from "@/types/domain";

export const roleHome: Record<UserRole, string> = {
  employee: "/employee/dashboard",
  manager: "/manager/dashboard",
  admin: "/admin/dashboard",
};

export const navigationByRole = {
  employee: [
    { href: "/employee/dashboard", label: "Dashboard", icon: Home },
    { href: "/employee/goals/create", label: "Create Goals", icon: ListChecks },
    { href: "/employee/goals", label: "My Goals", icon: ClipboardCheck },
    { href: "/employee/checkins", label: "Quarterly Check-ins", icon: FileClock },
  ],
  manager: [
    { href: "/manager/dashboard", label: "Team Dashboard", icon: Home },
    { href: "/manager/approvals", label: "Approval Queue", icon: ClipboardCheck },
    { href: "/manager/checkins", label: "Team Check-ins", icon: FileClock },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Admin Dashboard", icon: Home },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/audit-logs", label: "Audit Logs", icon: ShieldCheck },
    { href: "/admin/reports", label: "Reports", icon: FileBarChart },
  ],
} satisfies Record<UserRole, Array<{ href: string; label: string; icon: typeof Home }>>;
