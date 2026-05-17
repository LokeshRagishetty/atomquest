-- Add is_active column to users table
ALTER TABLE public.users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users
  WHERE id = auth.uid()
    AND is_active = true
$$;
