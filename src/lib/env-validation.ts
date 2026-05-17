type EnvCheck = {
  name: string;
  configured: boolean;
  scope: "server" | "client";
};

const REQUIRED_PRODUCTION_ENV: EnvCheck[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    scope: "client",
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    scope: "client",
  },
  {
    name: "NEXT_PUBLIC_APP_URL",
    configured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    scope: "client",
  },
  {
    name: "RESEND_API_KEY",
    configured: Boolean(process.env.RESEND_API_KEY),
    scope: "server",
  },
];

export function getProductionEnvReport() {
  const missing = REQUIRED_PRODUCTION_ENV.filter((item) => !item.configured);

  return {
    ok: missing.length === 0,
    checks: REQUIRED_PRODUCTION_ENV,
    missing: missing.map((item) => item.name),
  };
}
