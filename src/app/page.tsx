"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BriefcaseBusiness, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const loginCards: Array<{
    title: string;
    description: string;
    href: string;
    role: string;
    icon: LucideIcon;
  }> = [
    {
      title: "Employee Login",
      description: "Manage goal drafts, submissions, check-ins, and manager feedback.",
      href: "/login?role=employee",
      role: "employee",
      icon: BriefcaseBusiness,
    },
    {
      title: "Manager Login",
      description: "Review team submissions, approvals, check-ins, and activity.",
      href: "/login?role=manager",
      role: "manager",
      icon: UsersRound,
    },
    {
      title: "Admin Login",
      description: "Oversee users, audit logs, analytics, exports, and governance.",
      href: "/login?role=admin",
      role: "admin",
      icon: ShieldCheck,
    },
  ];

  async function handleLogin(role: string) {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(error);
    }

    router.push(`/login?role=${role}`);
  }

  return (
    <main className="relative min-h-svh overflow-hidden bg-background">
      <Image
        src="/images/atomquest-hero.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-10"
      />

      <div className="absolute inset-0 enterprise-grid opacity-60" />

      <section className="relative mx-auto flex min-h-svh w-full max-w-7xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <Image
            src="/logos/atomberg-logo.jpg"
            alt="Atomberg"
            width={146}
            height={48}
            className="mb-8 rounded bg-white object-contain shadow-sm"
          />

          <p className="text-sm font-semibold uppercase tracking-normal text-primary">
            AtomQuest Enterprise Portal
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-normal text-foreground sm:text-5xl">
            Goal setting, approvals, analytics, and governance in one authenticated workspace.
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Choose your workspace to continue with Supabase-backed enterprise authentication.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {loginCards.map((card) => {
            const Icon = card.icon;

            return (
              <button
                key={card.role}
                onClick={() => handleLogin(card.role)}
                className="group block text-left"
              >
                <Card className="h-full border-border/80 bg-card/95 shadow-enterprise transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
                  <CardHeader className="space-y-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>

                    <div>
                      <CardTitle className="text-xl">
                        {card.title}
                      </CardTitle>

                      <CardDescription className="mt-2 leading-6">
                        {card.description}
                      </CardDescription>
                    </div>
                  </CardHeader>

                  <CardContent>
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                      Continue

                      <ArrowRight
                        className="h-4 w-4 transition group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}