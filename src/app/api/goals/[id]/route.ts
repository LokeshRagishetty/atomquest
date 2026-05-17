/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getRouteParam, withApiRoute } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { mapGoalRowToGoal } from "@/lib/mappers";

export const PUT = withApiRoute("goals.update", async function PUT(req: Request, context: RouteContext) {
  const auth = await requireApiAuth(["employee", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const body = await req.json();
  const { goal } = body as { goal?: any };

  if (!goal) {
    return NextResponse.json({ error: "goal payload is required" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const updatePayload: Database["public"]["Tables"]["goals"]["Update"] = {
    thrust_area: goal.thrustArea,
    title: goal.title,
    description: goal.description,
    uom_type: goal.uomType,
    target: goal.target,
    weightage: goal.weightage,
  };

  const { data, error } = await (auth.supabase.from("goals") as any).update(updatePayload).eq("id", id).select().maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: "update_goal",
    entity_type: "goal",
    entity_id: id,
    old_value: existing,
    new_value: data,
  });

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data ? mapGoalRowToGoal(data as Database["public"]["Tables"]["goals"]["Row"]) : null });
});

export const DELETE = withApiRoute("goals.delete", async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireApiAuth(["employee", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const { data, error } = await (auth.supabase.from("goals") as any).delete().eq("id", id).select().maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Goal not found" }, { status: 404 });
  }

  const { error: logError } = await (auth.supabase.from("audit_logs") as any).insert({
    user_id: auth.profile.id,
    action: "delete_goal",
    entity_type: "goal",
    entity_id: id,
    old_value: data,
    new_value: null,
  });

  if (logError) {
    return NextResponse.json({ error: logError.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data });
});
