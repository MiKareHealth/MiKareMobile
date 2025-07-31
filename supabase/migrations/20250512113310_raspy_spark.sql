/*
  # Add onboarding fields to profiles table

  1. Changes
    - Add onboard_complete boolean field (default false)
    - Add show_splash boolean field (default true)
    - Updates will ensure profiles have these fields for onboarding flow
*/

-- Add onboarding fields to profiles table if they don't exist
DO $$ 
BEGIN
  -- Add onboard_complete column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'onboard_complete'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboard_complete boolean DEFAULT false;
  END IF;

  -- Add show_splash column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'show_splash'
  ) THEN
    ALTER TABLE profiles ADD COLUMN show_splash boolean DEFAULT true;
  END IF;
END $$;