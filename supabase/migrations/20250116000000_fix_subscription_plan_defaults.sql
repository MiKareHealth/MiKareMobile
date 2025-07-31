/*
  # Fix subscription plan defaults for new users

  1. Changes
    - Ensure subscription_plan column exists with correct default value
    - Ensure subscription_status column exists with correct default value
    - Update auth trigger function to include subscription fields
    - Fix any existing profiles with incorrect subscription_plan values

  2. Security
    - No changes to security model
    - Subscription fields follow same RLS policies as other profile fields
*/

-- Ensure subscription_plan column exists with correct default
DO $$
BEGIN
  -- Add subscription_plan column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan text DEFAULT 'MiKare Health - free plan';
  ELSE
    -- Update existing column to have correct default
    ALTER TABLE profiles ALTER COLUMN subscription_plan SET DEFAULT 'MiKare Health - free plan';
  END IF;
END $$;

-- Ensure subscription_status column exists with correct default
DO $$
BEGIN
  -- Add subscription_status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
  ELSE
    -- Update existing column to have correct default
    ALTER TABLE profiles ALTER COLUMN subscription_status SET DEFAULT 'inactive';
  END IF;
END $$;

-- Update any existing profiles that have incorrect subscription_plan values
UPDATE profiles 
SET 
  subscription_plan = 'MiKare Health - free plan',
  subscription_status = 'inactive'
WHERE 
  subscription_plan IS NULL 
  OR subscription_plan = 'free' 
  OR subscription_plan = 'Free'
  OR subscription_plan = '';

-- Update the auth trigger function to include subscription fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    username, 
    full_name, 
    avatar_url,
    subscription_plan,
    subscription_status,
    onboard_complete,
    show_splash
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'MiKare Health - free plan',
    'inactive',
    false,
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and points to the updated function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user(); 