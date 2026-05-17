"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";
import { CommandPalette } from "@/components/layout/command-palette";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { navigationByRole, roleHome } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { UserRole } from "@/types/domain";

function routeRoleFromPath(pathname: string): UserRole | null {
  const segment = pathname.split("/").filter(Boolean)[0];

  if (segment === "employee" || segment === "manager" || segment === "admin") {
    return segment;
  }

  return null;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { currentUser, hasHydrated, logout } = useAuth();

  useEffect(() => {
    if (!hasHydrated) return;

    if (!currentUser) {
      router.replace("/login");
      return;
    }

    const routeRole = routeRoleFromPath(pathname);

    if (routeRole && routeRole !== currentUser.role) {
      router.replace(roleHome[currentUser.role]);
    }
  }, [currentUser, hasHydrated, pathname, router]);

  const navigation = useMemo(() => {
    if (!currentUser) return [];
    return navigationByRole[currentUser.role];
  }, [currentUser]);

  if (!hasHydrated || !currentUser) {
    return (
      <main className="grid min-h-svh place-items-center bg-background p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <RealtimeRefresh />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 border-r bg-card transition-transform lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <Image
            src="/logos/atomberg-logo.jpg"
            alt="Atomberg"
            width={118}
            height={38}
            className="rounded bg-white object-contain"
          />
        </div>
        <nav className="space-y-1 p-4" aria-label="Dashboard navigation">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground",
                  active && "bg-primary/10 text-primary",
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-background/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-sm font-semibold">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">
                {currentUser.department} - {currentUser.role.toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CommandPalette />
            <NotificationBell />
            <ThemeToggle />
            <Button
              type="button"
              variant="outline"
              aria-label="Logout"
              onClick={() => {
                void logout();
              }}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
