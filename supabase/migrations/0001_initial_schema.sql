create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('employee', 'manager', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.goal_status as enum ('draft', 'submitted', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.uom_type as enum ('numeric_min', 'numeric_max', 'percentage', 'timeline', 'zero_based');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.quarter as enum ('q1', 'q2', 'q3', 'q4');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.progress_status as enum ('not_started', 'on_track', 'completed', 'delayed');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  role public.user_role not null default 'employee',
  manager_id uuid references public.users(id) on delete set null,
  department text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_goals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  target text not null,
  assigned_department text not null,
  created_by uuid not null references public.users(id) on delete restrict
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.users(id) on delete cascade,
  thrust_area text not null,
  title text not null,
  description text not null,
  uom_type public.uom_type not null,
  target text not null,
  weightage integer not null check (weightage >= 10 and weightage <= 100),
  status public.goal_status not null default 'draft',
  locked boolean not null default false,
  shared_goal_id uuid references public.shared_goals(id) on delete set null,
  review_comment text,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals(id) on delete cascade,
  quarter public.quarter not null,
  achievement text not null,
  progress_status public.progress_status not null default 'not_started',
  manager_comment text,
  completion_percentage numeric(5, 2) not null default 0 check (
    completion_percentage >= 0 and completion_percentage <= 100
  ),
  created_at timestamptz not null default now(),
  unique (goal_id, quarter)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_value jsonb,
  new_value jsonb,
  timestamp timestamptz not null default now()
);

create index if not exists idx_users_manager_id on public.users(manager_id);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_goals_employee_id on public.goals(employee_id);
create index if not exists idx_goals_status on public.goals(status);
create index if not exists idx_goals_shared_goal_id on public.goals(shared_goal_id);
create index if not exists idx_checkins_goal_id on public.checkins(goal_id);
create index if not exists idx_checkins_quarter on public.checkins(quarter);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_audit_logs_timestamp on public.audit_logs(timestamp desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_goals_set_updated_at on public.goals;
create trigger trg_goals_set_updated_at
before update on public.goals
for each row
execute function public.set_updated_at();

create or replace function public.prevent_invalid_goal_portfolio()
returns trigger
language plpgsql
as $$
declare
  goal_count integer;
begin
  select count(*)
  into goal_count
  from public.goals
  where employee_id = new.employee_id
    and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and status in ('draft', 'submitted', 'approved');

  goal_count := goal_count + 1;

  if goal_count > 8 then
    raise exception 'An employee can have a maximum of 8 goals.';
  end if;

  if new.weightage < 10 then
    raise exception 'Minimum weightage per goal is 10%%.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_goals_validate_portfolio on public.goals;
create trigger trg_goals_validate_portfolio
before insert or update of weightage, status, employee_id on public.goals
for each row
execute function public.prevent_invalid_goal_portfolio();

create or replace function public.enforce_goal_weightage_total()
returns trigger
language plpgsql
as $$
declare
  total_weightage integer;
begin
  if new.status in ('submitted', 'approved') then
    select coalesce(sum(weightage), 0)
    into total_weightage
    from public.goals
    where employee_id = new.employee_id
      and status in ('draft', 'submitted', 'approved');

    if total_weightage <> 100 then
      raise exception 'Total goal weightage must equal exactly 100%% before submission or approval.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_goals_validate_total_weightage on public.goals;
create constraint trigger trg_goals_validate_total_weightage
after insert or update of weightage, status, employee_id on public.goals
deferrable initially deferred
for each row
execute function public.enforce_goal_weightage_total();

create or replace function public.enforce_shared_goal_readonly_fields()
returns trigger
language plpgsql
as $$
begin
  if old.shared_goal_id is not null and new.shared_goal_id = old.shared_goal_id then
    if new.title <> old.title or new.target <> old.target then
      raise exception 'Shared goal title and target are read-only for recipients.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_goals_shared_readonly on public.goals;
create trigger trg_goals_shared_readonly
before update of title, target, shared_goal_id on public.goals
for each row
execute function public.enforce_shared_goal_readonly_fields();

create or replace function public.log_locked_goal_update()
returns trigger
language plpgsql
as $$
declare
  actor_id uuid;
begin
  actor_id := coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), '')::uuid,
    new.approved_by,
    new.employee_id
  );

  if old.locked = true and to_jsonb(old) <> to_jsonb(new) then
    insert into public.audit_logs (
      user_id,
      action,
      entity_type,
      entity_id,
      old_value,
      new_value
    )
    values (
      actor_id,
      'locked_goal_updated',
      'goal',
      new.id,
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_goals_audit_locked_updates on public.goals;
create trigger trg_goals_audit_locked_updates
after update on public.goals
for each row
execute function public.log_locked_goal_update();

alter table public.users enable row level security;
alter table public.shared_goals enable row level security;
alter table public.goals enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Authenticated users can read users" on public.users;
create policy "Authenticated users can read users"
on public.users for select
to authenticated
using (true);

drop policy if exists "Employees can read own goals" on public.goals;
create policy "Employees can read own goals"
on public.goals for select
to authenticated
using (employee_id = auth.uid());

drop policy if exists "Managers can read team goals" on public.goals;
create policy "Managers can read team goals"
on public.goals for select
to authenticated
using (
  exists (
    select 1
    from public.users employee
    where employee.id = goals.employee_id
      and employee.manager_id = auth.uid()
  )
);

drop policy if exists "Admins can read all goals" on public.goals;
create policy "Admins can read all goals"
on public.goals for select
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role = 'admin'
  )
);

drop policy if exists "Employees can manage unlocked own goals" on public.goals;
create policy "Employees can manage unlocked own goals"
on public.goals for all
to authenticated
using (employee_id = auth.uid() and locked = false)
with check (employee_id = auth.uid() and locked = false);

drop policy if exists "Admins can manage all data" on public.goals;
create policy "Admins can manage all data"
on public.goals for all
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role = 'admin'
  )
);

drop policy if exists "Managers can approve team goals" on public.goals;
create policy "Managers can approve team goals"
on public.goals for update
to authenticated
using (
  exists (
    select 1
    from public.users employee
    where employee.id = goals.employee_id
      and employee.manager_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.users employee
    where employee.id = goals.employee_id
      and employee.manager_id = auth.uid()
  )
);

drop policy if exists "Authenticated users can read shared goals" on public.shared_goals;
create policy "Authenticated users can read shared goals"
on public.shared_goals for select
to authenticated
using (true);

drop policy if exists "Managers and admins can create shared goals" on public.shared_goals;
create policy "Managers and admins can create shared goals"
on public.shared_goals for insert
to authenticated
with check (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role in ('manager', 'admin')
  )
);

drop policy if exists "Authenticated users can read related checkins" on public.checkins;
create policy "Authenticated users can read related checkins"
on public.checkins for select
to authenticated
using (
  exists (
    select 1
    from public.goals goal
    left join public.users employee on employee.id = goal.employee_id
    left join public.users app_user on app_user.id = auth.uid()
    where goal.id = checkins.goal_id
      and (
        goal.employee_id = auth.uid()
        or employee.manager_id = auth.uid()
        or app_user.role = 'admin'
      )
  )
);

drop policy if exists "Employees can manage own checkins" on public.checkins;
create policy "Employees can manage own checkins"
on public.checkins for all
to authenticated
using (
  exists (
    select 1
    from public.goals goal
    where goal.id = checkins.goal_id
      and goal.employee_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.goals goal
    where goal.id = checkins.goal_id
      and goal.employee_id = auth.uid()
  )
);

drop policy if exists "Managers can manage team checkins" on public.checkins;
create policy "Managers can manage team checkins"
on public.checkins for update
to authenticated
using (
  exists (
    select 1
    from public.goals goal
    join public.users employee on employee.id = goal.employee_id
    where goal.id = checkins.goal_id
      and employee.manager_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.goals goal
    join public.users employee on employee.id = goal.employee_id
    where goal.id = checkins.goal_id
      and employee.manager_id = auth.uid()
  )
);

drop policy if exists "Admins can manage all checkins" on public.checkins;
create policy "Admins can manage all checkins"
on public.checkins for all
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role = 'admin'
  )
);

drop policy if exists "Admins can read audit logs" on public.audit_logs;
create policy "Admins can read audit logs"
on public.audit_logs for select
to authenticated
using (
  exists (
    select 1
    from public.users app_user
    where app_user.id = auth.uid()
      and app_user.role = 'admin'
  )
);
