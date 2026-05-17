create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

create or replace function public.current_user_manager_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select manager_id from public.users where id = auth.uid()
$$;

create or replace function public.is_manager_of(target_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users employee
    where employee.id = target_employee_id
      and employee.manager_id = auth.uid()
  )
$$;

create or replace function public.can_access_goal(target_goal_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.goals goal
    left join public.users employee on employee.id = goal.employee_id
    where goal.id = target_goal_id
      and (
        goal.employee_id = auth.uid()
        or employee.manager_id = auth.uid()
        or public.current_user_role() = 'admin'
      )
  )
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, name, email, role, manager_id, department)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), split_part(coalesce(new.email, new.id::text), '@', 1)),
    coalesce(new.email, new.id::text),
    'employee',
    null,
    coalesce(nullif(new.raw_user_meta_data ->> 'department', ''), 'Unassigned')
  )
  on conflict (id) do update set
    email = excluded.email,
    name = coalesce(nullif(excluded.name, ''), public.users.name),
    department = coalesce(nullif(excluded.department, ''), public.users.department);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;
alter table public.shared_goals enable row level security;
alter table public.goals enable row level security;
alter table public.checkins enable row level security;
alter table public.audit_logs enable row level security;

alter table public.users force row level security;
alter table public.shared_goals force row level security;
alter table public.goals force row level security;
alter table public.checkins force row level security;
alter table public.audit_logs force row level security;

drop policy if exists "Authenticated users can read users" on public.users;
drop policy if exists "Users can read visible profiles" on public.users;
create policy "Users can read visible profiles"
on public.users for select
to authenticated
using (
  id = auth.uid()
  or manager_id = auth.uid()
  or id = public.current_user_manager_id()
  or public.current_user_role() = 'admin'
);

drop policy if exists "Users can create own employee profile" on public.users;
create policy "Users can create own employee profile"
on public.users for insert
to authenticated
with check (
  id = auth.uid()
  and role = 'employee'
  and manager_id is null
);

drop policy if exists "Admins can update users" on public.users;
create policy "Admins can update users"
on public.users for update
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read shared goals" on public.shared_goals;
drop policy if exists "Authenticated users can read shared goals production" on public.shared_goals;
create policy "Authenticated users can read shared goals production"
on public.shared_goals for select
to authenticated
using (true);

drop policy if exists "Managers and admins can create shared goals" on public.shared_goals;
drop policy if exists "Managers and admins can manage shared goals" on public.shared_goals;
create policy "Managers and admins can manage shared goals"
on public.shared_goals for all
to authenticated
using (public.current_user_role() in ('manager', 'admin'))
with check (
  public.current_user_role() = 'admin'
  or (
    public.current_user_role() = 'manager'
    and created_by = auth.uid()
  )
);

drop policy if exists "Employees can read own goals" on public.goals;
drop policy if exists "Managers can read team goals" on public.goals;
drop policy if exists "Admins can read all goals" on public.goals;
drop policy if exists "Employees can manage unlocked own goals" on public.goals;
drop policy if exists "Admins can manage all data" on public.goals;
drop policy if exists "Managers can approve team goals" on public.goals;
drop policy if exists "Users can read accessible goals" on public.goals;
drop policy if exists "Employees can create own draft goals" on public.goals;
drop policy if exists "Employees can update unlocked own goals" on public.goals;
drop policy if exists "Employees can delete unlocked own goals" on public.goals;
drop policy if exists "Managers can update submitted team goals" on public.goals;
drop policy if exists "Admins can manage goals" on public.goals;

create policy "Users can read accessible goals"
on public.goals for select
to authenticated
using (
  employee_id = auth.uid()
  or public.is_manager_of(employee_id)
  or public.current_user_role() = 'admin'
);

create policy "Employees can create own draft goals"
on public.goals for insert
to authenticated
with check (
  employee_id = auth.uid()
  and status = 'draft'
  and locked = false
);

create policy "Employees can update unlocked own goals"
on public.goals for update
to authenticated
using (
  employee_id = auth.uid()
  and locked = false
)
with check (
  employee_id = auth.uid()
  and status in ('draft', 'submitted', 'rejected')
  and (locked = false or status = 'submitted')
  and approved_by is null
);

create policy "Employees can delete unlocked own goals"
on public.goals for delete
to authenticated
using (
  employee_id = auth.uid()
  and locked = false
);

create policy "Managers can update submitted team goals"
on public.goals for update
to authenticated
using (
  public.is_manager_of(employee_id)
  and status = 'submitted'
)
with check (
  public.is_manager_of(employee_id)
  and status in ('submitted', 'approved', 'rejected')
);

create policy "Admins can manage goals"
on public.goals for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

drop policy if exists "Authenticated users can read related checkins" on public.checkins;
drop policy if exists "Employees can manage own checkins" on public.checkins;
drop policy if exists "Managers can manage team checkins" on public.checkins;
drop policy if exists "Admins can manage all checkins" on public.checkins;
drop policy if exists "Users can read accessible checkins" on public.checkins;
drop policy if exists "Users can create accessible checkins" on public.checkins;
drop policy if exists "Users can update accessible checkins" on public.checkins;
drop policy if exists "Users can delete accessible checkins" on public.checkins;

create policy "Users can read accessible checkins"
on public.checkins for select
to authenticated
using (public.can_access_goal(goal_id));

create policy "Users can create accessible checkins"
on public.checkins for insert
to authenticated
with check (public.can_access_goal(goal_id));

create policy "Users can update accessible checkins"
on public.checkins for update
to authenticated
using (public.can_access_goal(goal_id))
with check (public.can_access_goal(goal_id));

create policy "Users can delete accessible checkins"
on public.checkins for delete
to authenticated
using (public.can_access_goal(goal_id));

drop policy if exists "Admins can read audit logs" on public.audit_logs;
drop policy if exists "Users can read relevant audit logs" on public.audit_logs;
drop policy if exists "Users can insert own audit logs" on public.audit_logs;
drop policy if exists "Admins can manage audit logs" on public.audit_logs;

create policy "Users can read relevant audit logs"
on public.audit_logs for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_user_role() = 'admin'
  or (entity_type = 'goal' and public.can_access_goal(entity_id))
  or (
    entity_type = 'checkin'
    and exists (
      select 1
      from public.checkins checkin
      where checkin.id = audit_logs.entity_id
        and public.can_access_goal(checkin.goal_id)
    )
  )
);

create policy "Users can insert own audit logs"
on public.audit_logs for insert
to authenticated
with check (
  user_id = auth.uid()
  or public.current_user_role() = 'admin'
);

create policy "Admins can manage audit logs"
on public.audit_logs for all
to authenticated
using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
