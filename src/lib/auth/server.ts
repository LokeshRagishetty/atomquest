/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import type { UserRole } from "@/types/domain";
import { logger } from "@/lib/logger";

export type PublicUser = Database["public"]["Tables"]["users"]["Row"];

export type AuthContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  authUserId: string;
  profile: PublicUser;
};

type AuthFailure = {
  error: string;
  status: 401 | 403 | 500;
};

export async function getAuthContext(allowedRoles?: UserRole[]): Promise<{ data: AuthContext | null; failure: AuthFailure | null }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    logger.warn("auth.failure", {
      reason: authError?.message ?? "missing_user",
      allowedRoles,
    });
    return { data: null, failure: { error: "Unauthorized", status: 401 } };
  }

  const { data: profileData, error: profileError } = await (supabase.from("users") as any)
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    logger.error("auth.profile_lookup_failed", profileError, { authUserId: user.id });
    return { data: null, failure: { error: profileError.message, status: 500 } };
  }

  const profile = profileData as PublicUser | null;

  if (!profile) {
    logger.warn("auth.profile_missing", { authUserId: user.id });
    return { data: null, failure: { error: "User profile is missing. Please contact an administrator.", status: 403 } };
  }

  if (profile.is_active === false) {
    logger.warn("auth.inactive_user", { authUserId: user.id, role: profile.role });
    return { data: null, failure: { error: "This account is inactive. Please contact an administrator.", status: 403 } };
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    logger.warn("auth.role_forbidden", {
      authUserId: user.id,
      role: profile.role,
      allowedRoles,
    });
    return { data: null, failure: { error: "Forbidden", status: 403 } };
  }

  return {
    data: {
      supabase,
      authUserId: user.id,
      profile,
    },
    failure: null,
  };
}

export async function requireApiAuth(allowedRoles?: UserRole[]): Promise<AuthContext | NextResponse> {
  const auth = await getAuthContext(allowedRoles);

  if (!auth.data) {
    const failure = auth.failure ?? { error: "Unauthorized", status: 401 as const };
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }

  return auth.data;
}

export function isAuthResponse(value: AuthContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}
