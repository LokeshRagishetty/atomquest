import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/env";

type DbError = { message: string };
type AuditInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];
type AuditInsertTable = {
  insert: (payload: AuditInsert) => Promise<{ error: DbError | null }>;
};

export const GET = withApiRoute("admin.users.list", async function GET(req: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (isAuthResponse(auth)) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search");

  let query = auth.supabase.from("users").select("*").order("created_at", { ascending: false });

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data });
});

export const POST = withApiRoute("admin.users.create", async function POST(req: Request) {
  const auth = await requireApiAuth(["admin"]);
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { name, email, role, department, manager_id } = body;

  if (!name || !email || !role || !department) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const adminSupabase = createSupabaseAdminClient();

  if (!adminSupabase) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is required to invite users through Supabase Auth." },
      { status: 500 },
    );
  }

  const { data: authUserData, error: authUserError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: { name, department },
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/login`,
  });

  if (authUserError || !authUserData.user) {
    return NextResponse.json(
      { error: authUserError?.message || "Unable to invite Supabase Auth user." },
      { status: 500 },
    );
  }

  const { data, error } = await adminSupabase
    .from("users")
    .upsert(
      {
        id: authUserData.user.id,
        name,
        email,
        role,
        department,
        manager_id: manager_id || null,
        is_active: true,
      },
      { onConflict: "id" },
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const auditTable = auth.supabase.from("audit_logs") as unknown as AuditInsertTable;
  await auditTable.insert({
    user_id: auth.profile.id,
    action: "create_user",
    entity_type: "user",
    entity_id: data.id,
    new_value: data,
  });

  return NextResponse.json({ user: data });
});
