"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { useAuthStore } from "@/features/auth/store/auth-store";
import { roleHome } from "@/lib/constants/navigation";
import { mapUserRowToAppUser } from "@/lib/mappers";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { logger } from "@/lib/logger";
import type { Database } from "@/lib/supabase/database.types";
import type { AppUser, UserRole } from "@/types/domain";

type SignupValues = {
  name: string;
  email: string;
  password: string;
  department: string;
};

type UserRow = Database["public"]["Tables"]["users"]["Row"];
type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
type ProfileQuery = {
  maybeSingle: () => Promise<{ data: UserRow | null; error: { message: string } | null }>;
};
type ProfileFilterQuery = {
  eq: (column: string, value: string) => ProfileQuery;
};
type UsersReadTable = {
  select: (columns: string) => ProfileFilterQuery;
};
type UsersInsertTable = {
  insert: (payload: UserInsert) => {
    select: (columns: string) => ProfileQuery;
  };
};

const PROFILE_RETRY_MS = 300;

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function metadataString(user: User, key: string) {
  const value = user.user_metadata?.[key];

  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function buildEmployeeProfile(user: User): UserInsert {
  const email = user.email ?? `${user.id}@pending-email.local`;
  const name = metadataString(user, "name") ?? email.split("@")[0] ?? "New Employee";
  const department = metadataString(user, "department") ?? "Unassigned";

  return {
    id: user.id,
    email,
    name,
    department,
    role: "employee",
    manager_id: null,
    is_active: true,
  };
}

export function useAuth() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const currentUser = useAuthStore((s) => s.currentUser);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const loading = useAuthStore((s) => s.loading);
  const setCurrentUser = useAuthStore((s) => s.setCurrentUser);
  const setHasHydrated = useAuthStore((s) => s.setHasHydrated);
  const setLoading = useAuthStore((s) => s.setLoading);
  const reset = useAuthStore((s) => s.reset);

  const loadProfile = useCallback(
    async (user: User, attempts = 5): Promise<AppUser | null> => {
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const usersTable = supabase.from("users") as unknown as UsersReadTable;
        const { data, error } = await usersTable.select("*").eq("id", user.id).maybeSingle();

        if (error) {
          throw new Error(error.message);
        }

        if (data) {
          if (data.is_active === false) {
            await supabase.auth.signOut();
            throw new Error("This account is inactive. Please contact an administrator.");
          }

          return mapUserRowToAppUser(data);
        }

        await wait(PROFILE_RETRY_MS);
      }

      const usersInsertTable = supabase.from("users") as unknown as UsersInsertTable;
      const { data: createdProfile, error: createError } = await usersInsertTable
        .insert(buildEmployeeProfile(user))
        .select("*")
        .maybeSingle();

      if (createError) {
        logger.warn("auth.profile_auto_create_failed", {
          authUserId: user.id,
          reason: createError.message,
        });

        const usersTable = supabase.from("users") as unknown as UsersReadTable;
        const { data } = await usersTable.select("*").eq("id", user.id).maybeSingle();

        return data ? mapUserRowToAppUser(data) : null;
      }

      return createdProfile ? mapUserRowToAppUser(createdProfile) : null;
    },
    [supabase],
  );

  const clearSession = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      logger.warn("auth.signout_failed", {
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }, [supabase]);

  const refreshUser = useCallback(async (): Promise<AppUser | null> => {
    setLoading(true);

    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        await clearSession();
        setCurrentUser(null);
        return null;
      }

      if (!user) {
        setCurrentUser(null);
        return null;
      }

      const profile = await loadProfile(user);

      if (!profile) {
        await clearSession();
        setCurrentUser(null);
        return null;
      }

      setCurrentUser(profile);
      return profile;
    } finally {
      setHasHydrated(true);
      setLoading(false);
    }
  }, [clearSession, loadProfile, setCurrentUser, setHasHydrated, setLoading, supabase]);

  useEffect(() => {
    let mounted = true;

    void refreshUser().catch((error) => {
      logger.error("auth.refresh_failed", error);
      reset();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;

      if (!session?.user) {
        reset();
        return;
      }

      void refreshUser().catch((error) => {
        logger.error("auth.refresh_failed", error);
        reset();
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser, reset, supabase]);

const login = useCallback(
  async (email: string, password: string, expectedRole?: UserRole) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      await clearSession();
      reset();
      throw new Error(error.message);
    }

    const profile = await refreshUser();

    if (!profile) {
      await clearSession();
      reset();

      throw new Error(
        "User profile is missing. Please contact an administrator.",
      );
    }

    if (expectedRole && profile.role !== expectedRole) {
      await clearSession();
      reset();

      throw new Error(
        `This account is registered as ${profile.role}. Use ${profile.role} login.`,
      );
    }

    // allow Supabase auth cookies/session to sync
    await new Promise((resolve) => {
      window.setTimeout(resolve, 500);
    });

    // force full reload so middleware sees session immediately
    window.location.replace(roleHome[profile.role]);

    return profile;
  },
  [clearSession, refreshUser, reset, supabase],
);

  const signup = useCallback(
    async (values: SignupValues) => {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            department: values.department,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.session) {
        setHasHydrated(true);
        return null;
      }

      const profile = await refreshUser();

      if (!profile) {
        throw new Error("User profile is still being created. Please try signing in again.");
      }

      router.replace(roleHome[profile.role]);
      router.refresh();
      return profile;
    },
    [refreshUser, router, setHasHydrated, supabase],
  );

  const logout = useCallback(async () => {
    setLoading(true);

    try {
      await clearSession();
    } finally {
      reset();
      router.replace("/login");
      router.refresh();
    }
  }, [clearSession, reset, router, setLoading]);

  return {
    currentUser,
    hasHydrated,
    loading,
    login,
    signup,
    logout,
    refreshUser,
  };
}
