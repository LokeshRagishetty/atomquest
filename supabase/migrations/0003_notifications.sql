-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('goal_approved', 'goal_rejected', 'goal_submitted', 'checkin_reminder', 'system')),
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created
ON public.notifications(user_id, read, created_at DESC);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications (mark as read)" ON public.notifications;
CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
TO service_role
WITH CHECK (true);

-- Enable realtime for notifications
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

-- Function to create notification on goal status change
CREATE OR REPLACE FUNCTION public.notify_goal_status_change()
RETURNS TRIGGER AS $$
DECLARE
  manager_id UUID;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        NEW.employee_id,
        'Goal Approved',
        'Your goal "' || NEW.title || '" has been approved.',
        'goal_approved',
        '/employee/goals'
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        NEW.employee_id,
        'Goal Rejected',
        'Your goal "' || NEW.title || '" requires revision.',
        'goal_rejected',
        '/employee/goals'
      );
    ELSIF NEW.status = 'submitted' THEN
      SELECT users.manager_id INTO manager_id
      FROM public.users
      WHERE users.id = NEW.employee_id;

      IF manager_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          manager_id,
          'Goal Submitted',
          'A new goal "' || NEW.title || '" requires your approval.',
          'goal_submitted',
          '/manager/approvals'
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_goal_status_change ON public.goals;
CREATE TRIGGER on_goal_status_change
AFTER UPDATE OF status ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.notify_goal_status_change();
