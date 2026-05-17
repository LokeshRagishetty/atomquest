import type { UserRole } from "@/types/domain";

export function roleMatchesPath(role: UserRole | null, path: string): boolean {
  if (!role) return false;
  const segment = path.split("/").filter(Boolean)[0];
  return segment === role;
}

export function allowedRolesForPath(path: string): UserRole[] {
  const segment = path.split("/").filter(Boolean)[0];
  if (segment === "employee") return ["employee"];
  if (segment === "manager") return ["manager"];
  if (segment === "admin") return ["admin"];
  return ["employee", "manager", "admin"];
}
