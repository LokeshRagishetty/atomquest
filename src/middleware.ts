/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";
import type { UserRole } from "@/types/domain";
import { logger } from "@/lib/logger";

const ROLE_PATHS: UserRole[] = ["employee", "manager", "admin"];
const ROLE_HOME: Record<UserRole, string> = {
  employee: "/employee/dashboard",
  manager: "/manager/dashboard",
  admin: "/admin/dashboard",
};
const PUBLIC_AUTH_PATHS = new Set(["/login", "/signup", "/forgot-password"]);

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

function roleFromPath(pathname: string): UserRole | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  return ROLE_PATHS.find((role) => role === segment) ?? null;
}

export async function middleware(req: NextRequest) {
  logger.info("server.request", {
    method: req.method,
    path: req.nextUrl.pathname,
  });

  if (PUBLIC_AUTH_PATHS.has(req.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const requestedRole = roleFromPath(req.nextUrl.pathname);

  if (!requestedRole) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request: req });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    logger.warn("auth.middleware_env_missing", { path: req.nextUrl.pathname });
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
        response = NextResponse.next({ request: req });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn("auth.middleware_missing_user", { path: req.nextUrl.pathname, requestedRole });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("role", requestedRole);
    return NextResponse.redirect(loginUrl);
  }

  const { data: profileData } = await (supabase.from("users") as any).select("role").eq("id", user.id).maybeSingle();
  const profile = profileData as { role: UserRole } | null;

  if (!profile) {
    logger.warn("auth.middleware_profile_missing", { authUserId: user.id, path: req.nextUrl.pathname });
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("role", requestedRole);
    loginUrl.searchParams.set("error", "profile_missing");
    return NextResponse.redirect(loginUrl);
  }

  if (profile.role !== requestedRole) {
    logger.warn("auth.middleware_role_redirect", {
      authUserId: user.id,
      role: profile.role,
      requestedRole,
      path: req.nextUrl.pathname,
    });
    return NextResponse.redirect(new URL(ROLE_HOME[profile.role], req.url));
  }

  return response;
}

export const config = {
  matcher: ["/employee/:path*", "/manager/:path*", "/admin/:path*"],
};
