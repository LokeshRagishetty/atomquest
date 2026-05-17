"use client";

import { Building2, LogIn, UserPlus } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Toast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { roleHome } from "@/lib/constants/navigation";
import type { UserRole } from "@/types/domain";

type AuthMode = "login" | "signup";

const roleLabels: Record<UserRole, string> = {
  employee: "Employee",
  manager: "Manager",
  admin: "Admin",
};

export function RoleLoginCard({ selectedRole }: { selectedRole?: UserRole }) {
  const router = useRouter();
  const { currentUser, hasHydrated, login, signup, loading } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const roleLabel = useMemo(() => roleLabels[selectedRole ?? "employee"], [selectedRole]);
  const canSignup = !selectedRole || selectedRole === "employee";

  useEffect(() => {
    if (!canSignup && mode === "signup") {
      setMode("login");
    }
  }, [canSignup, mode]);

  useEffect(() => {
    if (hasHydrated && currentUser) {
      router.replace(roleHome[currentUser.role]);
    }
  }, [currentUser, hasHydrated, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setToast(null);

    try {
      if (mode === "login") {
        const user = await login(email, password, selectedRole);
        setToast(`Signed in as ${user.email}`);
        return;
      }

      const user = await signup({ name, email, password, department });
      setToast(user ? `Account created for ${user.email}` : "Check your email to confirm your account.");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Authentication failed");
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  const isBusy = loading || submitting;

  return (
    <Card className="w-full max-w-xl border-border/80 shadow-enterprise">
      <CardHeader className="space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </div>
        <div>
          <CardTitle className="text-2xl">
            {mode === "signup" ? "Create Employee Account" : `${roleLabel} Login`}
          </CardTitle>
          <CardDescription className="mt-2 text-base">
            Use your enterprise account to manage goals, approvals, check-ins, reports, and audit activity.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {canSignup ? (
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "login" ? "default" : "outline"} onClick={() => setMode("login")}>
              <LogIn className="h-4 w-4" />
              Login
            </Button>
            <Button type="button" variant={mode === "signup" ? "default" : "outline"} onClick={() => setMode("signup")}>
              <UserPlus className="h-4 w-4" />
              Signup
            </Button>
          </div>
        ) : null}

        <Separator />

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode === "signup" ? (
            <>
              <div className="grid gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" value={department} onChange={(event) => setDepartment(event.target.value)} required />
              </div>
            </>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <Button className="w-full" size="lg" type="submit" disabled={isBusy}>
            {isBusy ? "Please wait..." : mode === "login" ? `Sign in as ${roleLabel.toLowerCase()}` : "Create account"}
          </Button>
        </form>

        {toast ? <Toast message={toast} /> : null}
      </CardContent>
    </Card>
  );
}
