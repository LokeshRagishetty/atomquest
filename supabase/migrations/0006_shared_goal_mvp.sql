drop policy if exists "Managers can create locked shared goals for reports" on public.goals;
create policy "Managers can create locked shared goals for reports"
on public.goals for insert
to authenticated
with check (
  public.current_user_role() = 'manager'
  and public.is_manager_of(employee_id)
  and status = 'draft'
  and locked = true
  and shared_goal_id is not null
);

drop policy if exists "Employees can update own shared goal weightage" on public.goals;
create policy "Employees can update own shared goal weightage"
on public.goals for update
to authenticated
using (
  employee_id = auth.uid()
  and shared_goal_id is not null
)
with check (
  employee_id = auth.uid()
  and shared_goal_id is not null
);

create or replace function public.enforce_shared_goal_readonly_fields()
returns trigger
language plpgsql
as $$
begin
  if old.shared_goal_id is not null and new.shared_goal_id = old.shared_goal_id then
    if new.title <> old.title
      or new.target <> old.target
      or new.description <> old.description
      or new.thrust_area <> old.thrust_area
      or new.uom_type <> old.uom_type then
      raise exception 'Shared goal title, description, thrust area, UoM type, and target are read-only for recipients.';
    end if;

    if public.current_user_role() = 'employee'
      and (
        new.employee_id <> old.employee_id
        or new.status <> old.status
        or new.locked <> old.locked
        or new.review_comment is distinct from old.review_comment
        or new.approved_by is distinct from old.approved_by
        or new.approved_at is distinct from old.approved_at
        or new.created_at <> old.created_at
      ) then
      raise exception 'Only shared goal weightage can be edited by recipients.';
    end if;
  end if;

  return new;
end;
$$;
