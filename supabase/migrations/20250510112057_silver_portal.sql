/*
  # Create mood_entries table and RLS policies

  1. New Tables
    - `mood_entries`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references patients)
      - `date` (date with uniqueness constraint)
      - `body` (integer, 1-5)
      - `mind` (integer, 1-5)
      - `sleep` (integer, 1-5)
      - `mood` (integer, 1-5)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `mood_entries` table
    - Add policies for authenticated users to manage their patients' mood entries
*/

-- Create the mood_entries table
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  body INTEGER NOT NULL CHECK (body BETWEEN 1 AND 5),
  mind INTEGER NOT NULL CHECK (mind BETWEEN 1 AND 5),
  sleep INTEGER NOT NULL CHECK (sleep BETWEEN 1 AND 5),
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Add a unique constraint to ensure only one entry per profile per day
  UNIQUE(profile_id, date)
);

-- Enable Row Level Security
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- SELECT policy: Users can view mood entries for their patients
CREATE POLICY "Users can view mood entries for their patients"
  ON mood_entries
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

-- INSERT policy: Users can create mood entries for their patients
CREATE POLICY "Users can create mood entries for their patients"
  ON mood_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

-- UPDATE policy: Users can update mood entries for their patients
CREATE POLICY "Users can update mood entries for their patients"
  ON mood_entries
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

-- DELETE policy: Users can delete mood entries for their patients
CREATE POLICY "Users can delete mood entries for their patients"
  ON mood_entries
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

-- Add missing INSERT policy for profiles table
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Also add a policy to allow users to view their own profile
-- The existing "Public profiles are viewable by everyone" might be too permissive
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Function to create missing profile for existing users
CREATE OR REPLACE FUNCTION create_missing_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if profile already exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create missing profiles on auth state change
CREATE OR REPLACE TRIGGER ensure_profile_exists
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_missing_profile();