import { NextResponse } from "next/server";
import { getProductionEnvReport } from "@/lib/env-validation";
import { withApiRoute } from "@/lib/api-utils";

export const GET = withApiRoute("health", function GET() {
  const envReport = getProductionEnvReport();

  return NextResponse.json({
    status: "ok",
    service: "ATOMQUEST Goal Setting & Tracking Portal",
    supabaseConfigured: Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    productionReady: envReport.ok,
    missingEnv: envReport.missing,
  });
});
