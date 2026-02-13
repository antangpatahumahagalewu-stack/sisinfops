-- Migration: Add Program Approval Workflow
-- Date: 2026-02-13
-- Description: Update programs status enum and add finance_approver role

-- 1. First, update the programs status enum to include workflow statuses
ALTER TABLE programs DROP CONSTRAINT IF EXISTS programs_status_check;

ALTER TABLE programs ADD CONSTRAINT programs_status_check 
CHECK (status IN (
  'draft', 
  'submitted_for_review', 
  'under_review', 
  'approved', 
  'rejected', 
  'needs_revision', 
  'active', 
  'completed', 
  'cancelled'
));

-- 2. Ensure approval workflow columns exist (they already do from previous migration)
--    submitted_at, submitted_by, reviewed_at, reviewed_by, review_notes already exist
--    Just make sure they're nullable (which they are)

-- 3. Add finance_approver role to profiles table enum
-- First check if the role column has a check constraint
DO $$ 
BEGIN
  -- Drop existing constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
    AND conrelid = 'profiles'::regclass
  ) THEN
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
  END IF;
END $$;

-- Recreate constraint with new role
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'program_planner', 'finance_approver', 'finance_manager', 'viewer'));

-- 4. Create notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'program_submitted', 'program_approved', 'program_rejected', 'revision_requested'
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB, -- Additional data like program_id, reviewer_id, etc.
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 5. Create notification settings table (optional, for future)
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, notification_type)
);

-- 6. Add trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for notifications and notification_settings
DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
    BEFORE UPDATE ON notification_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Insert default notification settings for all users (optional)
INSERT INTO notification_settings (user_id, notification_type, enabled)
SELECT 
  p.id,
  unnest(ARRAY['program_submitted', 'program_approved', 'program_rejected', 'revision_requested']),
  TRUE
FROM profiles p
ON CONFLICT (user_id, notification_type) DO NOTHING;

-- 8. Create a view for programs that need review (for finance team)
CREATE OR REPLACE VIEW programs_needing_review AS
SELECT 
  p.*,
  ps.full_name as submitted_by_name,
  pr.full_name as reviewed_by_name
FROM programs p
LEFT JOIN profiles ps ON p.submitted_by = ps.id
LEFT JOIN profiles pr ON p.reviewed_by = pr.id
WHERE p.status IN ('submitted_for_review', 'under_review')
ORDER BY p.submitted_at DESC NULLS LAST, p.created_at DESC;

-- 9. Create a view for approved programs only (for carbon projects and investor pages)
CREATE OR REPLACE VIEW approved_programs AS
SELECT 
  p.*,
  ps.full_name as submitted_by_name,
  pr.full_name as reviewed_by_name,
  pr.role as reviewer_role
FROM programs p
LEFT JOIN profiles ps ON p.submitted_by = ps.id
LEFT JOIN profiles pr ON p.reviewed_by = pr.id
WHERE p.status = 'approved'
ORDER BY p.reviewed_at DESC NULLS LAST, p.created_at DESC;

-- 10. Update any existing draft programs to have null values for approval columns
-- (This ensures clean state for new workflow)
UPDATE programs 
SET 
  submitted_at = NULL,
  submitted_by = NULL,
  reviewed_at = NULL,
  reviewed_by = NULL,
  review_notes = NULL
WHERE status = 'draft';

-- 11. Create RLS policies for notifications (if using RLS)
-- Note: This assumes RLS is already enabled on notifications table
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can view their own notifications" ON notifications
--   FOR SELECT USING (user_id = auth.uid());
-- CREATE POLICY "Users can update their own notifications" ON notifications
--   FOR UPDATE USING (user_id = auth.uid());

-- Migration completed
COMMENT ON TABLE notifications IS 'In-app notifications for workflow updates';
COMMENT ON TABLE notification_settings IS 'User notification preferences';
COMMENT ON VIEW programs_needing_review IS 'Programs that need finance team review';
COMMENT ON VIEW approved_programs IS 'Approved programs only (for carbon projects and investor dashboards)';