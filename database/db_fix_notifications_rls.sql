-- Enable RLS just in case (though error suggests it is already on)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 1. VIEW Policy: Users can only see their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);

-- 2. INSERT Policy: Allow system interaction
-- Users need to insert notifications for Admins (Support Request)
-- Admins need to insert notifications for Users (Broadcasts)
-- So we allow all authenticated users to insert.
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
CREATE POLICY "Authenticated users can insert notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. UPDATE/DELETE Policy: Users can mark as read (update) or dismiss (delete) their OWN notifications
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
