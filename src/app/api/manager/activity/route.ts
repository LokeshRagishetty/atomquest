/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";

export const GET = withApiRoute("manager.activity.list", async function GET() {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const { data, error } = await (auth.supabase.from("audit_logs") as any)
    .select("*, users:user_id(id,name,email,role,manager_id,department,created_at)")
    .order("timestamp", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ activity: data });
});
