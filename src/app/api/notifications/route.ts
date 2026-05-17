/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api-utils";
import { isAuthResponse, requireApiAuth } from "@/lib/auth/server";

function isMissingNotificationsTable(error: { code?: string; message?: string }) {
  return (
    error.code === "42P01" ||
    error.message?.toLowerCase().includes("notifications") === true
  );
}

export const GET = withApiRoute("notifications.list", async function GET() {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const { data, error } = await (auth.supabase.from("notifications") as any)
    .select("id,title,message,read,link,created_at")
    .eq("user_id", auth.profile.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    if (isMissingNotificationsTable(error)) {
      return NextResponse.json({ notifications: [], unreadCount: 0, tableAvailable: false });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const notifications = data || [];

  return NextResponse.json({
    notifications,
    unreadCount: notifications.filter((notification: { read: boolean }) => !notification.read).length,
    tableAvailable: true,
  });
});

export const PATCH = withApiRoute("notifications.mark_read", async function PATCH(req: Request) {
  const auth = await requireApiAuth();
  if (isAuthResponse(auth)) return auth;

  const body = await req.json();
  const { id, all } = body as { id?: string; all?: boolean };

  if (!id && !all) {
    return NextResponse.json({ error: "id or all is required" }, { status: 400 });
  }

  let query = (auth.supabase.from("notifications") as any)
    .update({ read: true })
    .eq("user_id", auth.profile.id);

  if (all) {
    query = query.eq("read", false);
  } else {
    query = query.eq("id", id);
  }

  const { error } = await query;

  if (error) {
    if (isMissingNotificationsTable(error)) {
      return NextResponse.json({ ok: true, tableAvailable: false });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, tableAvailable: true });
});
