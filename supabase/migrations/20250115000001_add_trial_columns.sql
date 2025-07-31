/*
  # Add trial columns to profiles table

  1. Changes
    - Add trial_started_at timestamp column to track when trial began
    - Add trial_completed boolean column to track if trial has ended
    - Add subscription_plan and subscription_status columns if they don't exist

  2. Security
    - No changes to security model
    - Trial fields follow same RLS policies as other profile fields
*/

-- Add trial_started_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_started_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_started_at timestamptz;
  END IF;
END $$;

-- Add trial_completed column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'trial_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN trial_completed boolean DEFAULT false;
  END IF;
END $$;

-- Add subscription_plan column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_plan'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_plan text DEFAULT 'MiKare Health - free plan';
  END IF;
END $$;

-- Add subscription_status column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN subscription_status text DEFAULT 'inactive';
  END IF;
END $$; 