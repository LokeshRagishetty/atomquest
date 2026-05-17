# Architecture

## Runtime Architecture

- Vercel hosts the Next.js 15 App Router frontend.
- Supabase provides PostgreSQL, Auth user identity, row-level security, and SQL migrations.
- Browser clients use Supabase Auth for signup, login, logout, and persisted sessions.
- Server routes use authenticated Supabase clients for controlled reads, writes, reports, and audit events.
- Route handlers emit structured JSON logs for requests, auth failures, API failures, and export failures.

## Application Layers

- `src/app` contains routes, layouts, route handlers, and page composition.
- `src/features` contains domain modules for auth, goals, dashboards, and reporting.
- `src/components` contains reusable enterprise UI primitives and layout components.
- `src/lib/supabase` contains typed Supabase client factories and database types.
- `supabase/migrations` is the source of truth for database schema.

## Data Model

Core tables:

- `users`
- `goals`
- `checkins`
- `audit_logs`
- `shared_goals`
- `notifications`

Key database controls:

- Maximum 8 goals per employee
- Minimum 10% weightage per goal
- 100% total weightage on submission or approval
- Shared goal title and target read-only for recipients
- Locked goal updates captured in `audit_logs`
- New Auth signups automatically create `public.users` employee profiles
- RLS scopes data for employees, direct managers, and admins
- Notifications are scoped to the authenticated recipient through RLS and realtime subscriptions are cleaned up on unmount
