-- Migration: Add phone, location, and bio fields to profiles table
-- Date: 2026-01-12
-- Description: This migration adds missing fields (phone, location, bio) to the profiles table
--              to support the profile edit page at /id/dashboard/profile/edit

-- Add phone column (nullable, up to 255 characters)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone VARCHAR(255);

-- Add location column (nullable, up to 255 characters)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- Add bio column (nullable, text for longer description)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Comment for documentation
COMMENT ON COLUMN profiles.phone IS 'Nomor telepon pengguna';
COMMENT ON COLUMN profiles.location IS 'Lokasi pengguna';
COMMENT ON COLUMN profiles.bio IS 'Deskripsi singkat tentang pengguna';

-- Update the handle_new_user function to include these fields (optional, they can be null)
-- Note: The function currently only inserts id, role, full_name. We'll keep as is since new fields are nullable.

-- Verify the changes
DO $$
BEGIN
    -- Check if columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'phone') THEN
        RAISE EXCEPTION 'Column phone not added';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'location') THEN
        RAISE EXCEPTION 'Column location not added';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        RAISE EXCEPTION 'Column bio not added';
    END IF;
    
    RAISE NOTICE 'Migration 20260112_add_profile_fields applied successfully';
END $$;

-- For existing data: set default values if needed (optional)
-- UPDATE profiles SET phone = '' WHERE phone IS NULL;
-- UPDATE profiles SET location = '' WHERE location IS NULL;
-- UPDATE profiles SET bio = '' WHERE bio IS NULL;

-- End of migration
