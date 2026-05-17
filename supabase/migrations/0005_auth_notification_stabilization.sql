create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null check (type in ('goal_approved', 'goal_rejected', 'goal_submitted', 'checkin_reminder', 'system')),
  read boolean not null default false,
  link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_read_created
on public.notifications(user_id, read, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "Users can view their own notifications" on public.notifications;
create policy "Users can view their own notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update their own notifications (mark as read)" on public.notifications;
create policy "Users can update their own notifications (mark as read)"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Service role can insert notifications" on public.notifications;
create policy "Service role can insert notifications"
on public.notifications for insert
to service_role
with check (true);

drop trigger if exists trg_notifications_set_updated_at on public.notifications;
create trigger trg_notifications_set_updated_at
before update on public.notifications
for each row
execute function public.set_updated_at();

create or replace function public.notify_goal_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  manager_id uuid;
begin
  if old.status is distinct from new.status then
    if new.status = 'approved' then
      insert into public.notifications (user_id, title, message, type, link)
      values (
        new.employee_id,
        'Goal Approved',
        'Your goal "' || new.title || '" has been approved.',
        'goal_approved',
        '/employee/goals'
      );
    elsif new.status = 'rejected' then
      insert into public.notifications (user_id, title, message, type, link)
      values (
        new.employee_id,
        'Goal Rejected',
        'Your goal "' || new.title || '" requires revision.',
        'goal_rejected',
        '/employee/goals'
      );
    elsif new.status = 'submitted' then
      select users.manager_id into manager_id
      from public.users
      where users.id = new.employee_id;

      if manager_id is not null then
        insert into public.notifications (user_id, title, message, type, link)
        values (
          manager_id,
          'Goal Submitted',
          'A new goal "' || new.title || '" requires your approval.',
          'goal_submitted',
          '/manager/approvals'
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_goal_status_change on public.goals;
create trigger on_goal_status_change
after update of status on public.goals
for each row
execute function public.notify_goal_status_change();

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
