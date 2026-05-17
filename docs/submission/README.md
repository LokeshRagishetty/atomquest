# Submission

## Authentication

The app uses Supabase Auth for real signup, login, logout, and persisted sessions.
New signups automatically create `public.users` employee profiles through the database trigger.
Manager and admin access should be granted by updating `public.users.role` and reporting lines in Supabase.

## Expected Hosted Setup

- Frontend: Vercel
- Backend: Supabase
- Build command: `npm run build`
- Start command: Vercel default Next.js runtime
- Health check: `/api/health`

## Environment Variables

Use the variables listed in `.env.example`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only for external admin/bootstrap scripts

## Production Bootstrap

1. Run all migrations in `supabase/migrations/` in numeric order.
2. Create the first admin through `/login` signup or Supabase Auth.
3. Promote the profile in SQL:

```sql
update public.users
set role = 'admin', is_active = true
where email = 'admin@example.com';
```

4. Use the Admin User Management page to promote managers, assign reporting lines, and deactivate users.
5. Do not seed demo users, fixed IDs, goals, check-ins, or audit events in production.
