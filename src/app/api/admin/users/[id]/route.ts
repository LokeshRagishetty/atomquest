/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getRouteParam, withApiRoute } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";

export const PATCH = withApiRoute("admin.users.update", async function PATCH(req: Request, context: RouteContext) {
  const auth = await requireApiAuth(["admin"]);
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const body = await req.json();
  const { updates } = body;

  if (!updates) {
    return NextResponse.json({ error: "updates are required" }, { status: 400 });
  }

  const sanitizedUpdates = {
    ...updates,
    ...(Object.prototype.hasOwnProperty.call(updates, "manager_id")
      ? { manager_id: updates.manager_id || null }
      : {}),
  };

  const { data: existing, error: fetchError } = await auth.supabase
    .from("users")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data, error } = await (auth.supabase.from("users") as any)
    .update(sanitizedUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: "update_user",
    entity_type: "user",
    entity_id: data.id,
    old_value: existing,
    new_value: data,
  });

  return NextResponse.json({ user: data });
});
