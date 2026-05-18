/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { getRouteParam, withApiRoute } from "@/lib/api-utils";
import type { RouteContext } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { mapGoalRowToGoal } from "@/lib/mappers";
import { goalFormSchema } from "@/lib/validation/goal";

export const PUT = withApiRoute("goals.update", async function PUT(req: Request, context: RouteContext) {
  const auth = await requireApiAuth(["employee", "admin"]);
  if (isAuthResponse(auth)) return auth;

  const id = await getRouteParam(context, "id");
  const body = await req.json();
  const { goal } = body as { goal?: any };

  if (!goal) {
    return NextResponse.json({ error: "goal payload is required" }, { status: 400 });
  }

  const parsedGoal = goalFormSchema.safeParse(goal);
  if (!parsedGoal.success) {
    return NextResponse.json({ error: parsedGoal.error.issues[0]?.message ?? "Invalid goal payload." }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await (auth.supabase.from("goals") as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const values = parsedGoal.data;
  const isOwner = existing.employee_id === auth.profile.id;

  if (auth.profile.role === "employee" && !isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let updatePayload: Database["public"]["Tables"]["goals"]["Update"];

  if (auth.profile.role === "employee" && existing.shared_goal_id) {
    const attemptedImmutableChange =
      values.thrustArea !== existing.thrust_area ||
      values.title !== existing.title ||
      values.description !== existing.description ||
      values.uomType !== existing.uom_type ||
      values.target !== existing.target;

    if (attemptedImmutableChange) {
      return NextResponse.json({ error: "Only weightage can be edited on shared goals." }, { status: 400 });
    }

    updatePayload = {
      weightage: values.weightage,
    };
  } else if (auth.profile.role === "employee" && existing.locked) {
    return NextResponse.json({ error: "Locked goals cannot be edited." }, { status: 400 });
  } else {
    updatePayload = {
      thrust_area: values.thrustArea,
      title: values.title,
      description: values.description,
      uom_type: values.uomType,
      target: values.target,
      weightage: values.weightage,
    };
  }

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
