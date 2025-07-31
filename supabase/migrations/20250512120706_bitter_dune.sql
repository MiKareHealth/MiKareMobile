/*
  # Update demo account to have completed onboarding
  
  1. Changes
    - Set onboard_complete = true for demo@example.com user
    - Ensure demo account can bypass onboarding flow

  2. Security
    - No changes to security model
*/

-- Update the demo user to have completed onboarding
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Find the demo user ID
  SELECT id INTO demo_user_id
  FROM auth.users
  WHERE email = 'demo@example.com';
  
  -- If demo user exists, update their profile
  IF demo_user_id IS NOT NULL THEN
    UPDATE profiles
    SET 
      onboard_complete = true,
      show_splash = false
    WHERE id = demo_user_id;
  END IF;
END $$;