/*
  # Add additional fields to profiles table for settings page

  1. Changes
    - Add timezone column (text, nullable with default)
    - Add time_format column (text, nullable with default)
    - Add plan_type column (text, nullable with default)
    - Add last_login column (timestamptz, nullable)
*/

DO $$ 
BEGIN
  -- Add timezone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;

  -- Add time_format column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'time_format'
  ) THEN
    ALTER TABLE profiles ADD COLUMN time_format text DEFAULT '12h';
  END IF;

  -- Add plan_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN plan_type text DEFAULT 'Free';
  END IF;

  -- Add last_login column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_login'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_login timestamptz;
  END IF;
END $$;

-- Create storage bucket for user photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-photos', 'user-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for user photos
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can view their own photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload their own photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
  
  -- Create policy for viewing photos
  CREATE POLICY "Users can view their own photos"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'user-photos' AND
    (
      -- Allow access if authenticated and owns the photo
      (auth.uid() IS NOT NULL AND
        storage.objects.name LIKE auth.uid() || '/%'
      )
      -- Or if the bucket is public and the URL is valid
      OR bucket_id IN (
        SELECT id FROM storage.buckets
        WHERE public = true
      )
    )
  );
  
  -- Create policy for uploading photos
  CREATE POLICY "Users can upload their own photos"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'user-photos' AND
    auth.uid() IS NOT NULL AND
    storage.objects.name LIKE auth.uid() || '/%'
  );
  
  -- Create policy for updating photos
  CREATE POLICY "Users can update their own photos"
  ON storage.objects FOR UPDATE
  TO public
  USING (
    bucket_id = 'user-photos' AND
    auth.uid() IS NOT NULL AND
    storage.objects.name LIKE auth.uid() || '/%'
  );
  
  -- Create policy for deleting photos
  CREATE POLICY "Users can delete their own photos"
  ON storage.objects FOR DELETE
  TO public
  USING (
    bucket_id = 'user-photos' AND
    auth.uid() IS NOT NULL AND
    storage.objects.name LIKE auth.uid() || '/%'
  );
END $$;

-- Create a trigger to update last_login when user signs in
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET last_login = NOW()
  WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'on_auth_user_login'
  ) THEN
    CREATE TRIGGER on_auth_user_login
      AFTER INSERT ON auth.sessions
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_user_login();
  END IF;
END $$;