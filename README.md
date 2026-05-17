# ATOMQUEST Goal Setting & Tracking Portal

Production-oriented full-stack scaffold for the AtomQuest Hackathon goal lifecycle portal.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components
- Supabase PostgreSQL + Auth
- Recharts
- React Hook Form + Zod
- Supabase persisted auth sessions

## Folder Structure

- `src/app/` - App Router routes, layouts, and route handlers
- `src/components/` - reusable layout, shared, and UI components
- `src/features/` - feature modules for auth, dashboards, goals, and reports
- `src/lib/` - auth helpers, constants, Supabase clients, utilities, validation
- `src/types/` - application domain types
- `supabase/migrations/` - PostgreSQL schema migrations
- `supabase/seed.sql` - intentionally empty production seed placeholder
- `public/images/` - hero and app imagery
- `public/logos/` - brand assets
- `docs/` - architecture and submission notes

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_APP_URL`
   - `RESEND_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` only if you run external admin/bootstrap scripts
4. Run the SQL migrations in order from `supabase/migrations/`.
5. Keep `supabase/seed.sql` empty unless you are adding environment-specific production bootstrap data.

## Local Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Create a real Supabase Auth account from `/login`. New signups are created as employees; promote managers/admins and assign reporting lines in `public.users`.

## Production Hardening

The production pass includes:

- Supabase Auth signup, login, logout, and persisted sessions
- Protected employee, manager, and admin dashboard workflows
- Authenticated route handlers with server-side request/error logging
- RLS policies for users, goals, check-ins, reports, audit logs, and notifications
- Global and route-level error boundaries plus loading states
- Retry UI for failed client-side data loads
- CSV, XLSX, and PDF exports
- Empty production seed file with no demo users or mock data

## Deployment

Frontend target: Vercel.

Backend target: Supabase.

### Supabase Production Checklist

1. Create a production Supabase project.
2. Apply every SQL file in `supabase/migrations/` in numeric order.
3. Confirm Auth email settings and allowed redirect URLs include the Vercel production URL.
4. Confirm RLS is enabled for `users`, `goals`, `checkins`, `audit_logs`, `shared_goals`, and `notifications`.
5. Keep `supabase/seed.sql` empty for production unless you intentionally bootstrap environment-owned data.
6. Create the first admin through Supabase Auth signup, then update that user in `public.users`:

```sql
update public.users
set role = 'admin', is_active = true
where email = 'admin@example.com';
```

7. Promote managers by updating `public.users.role = 'manager'`, then assign employees with `manager_id`.

### Vercel Deployment

1. Import the project in Vercel.
2. Add the environment variables from `.env.example`.
3. Use the default install command, `npm run build`, and the Vercel Next.js runtime.
4. Set `NEXT_PUBLIC_APP_URL` to the production Vercel URL.
5. After deploy, verify `/api/health` reports `productionReady: true`.

### Migration Instructions

For a fresh production database, run:

```bash
supabase db push
```

If you apply SQL manually, run the migration files in order from `0001` through the latest file. Do not apply `supabase/seed.sql` to production unless it contains approved bootstrap data.

### Quality Gates

Run before every deployment:

```bash
npm run lint
npm run typecheck
npm run build
```
