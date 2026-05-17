import Image from "next/image";
import { redirect } from "next/navigation";
import { RoleLoginCard } from "@/features/auth/components/role-login-card";
import { getAuthContext } from "@/lib/auth/server";
import { roleHome } from "@/lib/constants/navigation";
import type { UserRole } from "@/types/domain";

type LoginPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function parseRole(value: string | string[] | undefined): UserRole | undefined {
  const role = Array.isArray(value) ? value[0] : value;

  return role === "employee" || role === "manager" || role === "admin" ? role : undefined;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : {};
  const selectedRole = parseRole(params.role);
  const auth = await getAuthContext();

  if (auth.data) {
    redirect(roleHome[auth.data.profile.role]);
  }

  return (
    <main className="grid min-h-svh bg-background lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 text-white lg:block">
        <Image
          src="/images/atomquest-hero.png"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/78 to-slate-950/20" />
        <div className="relative z-10 flex h-full flex-col justify-end p-12">
          <Image
            src="/logos/atomberg-logo.jpg"
            alt="Atomberg"
            width={150}
            height={50}
            className="mb-8 rounded bg-white object-contain"
          />
          <p className="mb-3 text-sm font-semibold uppercase text-amber-300">
            AtomQuest Hackathon 1.0
          </p>
          <h1 className="max-w-2xl text-5xl font-semibold leading-tight">
            Goal Setting &amp; Tracking Portal
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-200">
            A production-oriented enterprise scaffold for employee goals, manager approvals,
            quarterly check-ins, dashboards, exports, and audit controls.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-4 py-10 sm:px-6 lg:px-10">
        <RoleLoginCard selectedRole={selectedRole} />
      </section>
    </main>
  );
}
