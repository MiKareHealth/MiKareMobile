/*
  # Fix storage policies for patient photos

  1. Changes
    - Set bucket to public for URL access
    - Create simplified storage policies
    - Fix RLS policy violations
    - Ensure proper access control

  2. Security
    - Allow public URL access to photos
    - Maintain strict write control
    - Validate patient ownership
*/

-- Create or update storage bucket
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('patient-photos', 'patient-photos', true)
  ON CONFLICT (id) DO UPDATE
  SET public = true;
END $$;

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access" ON storage.objects;
  DROP POLICY IF EXISTS "Upload Access" ON storage.objects;
  DROP POLICY IF EXISTS "Update Access" ON storage.objects;
  DROP POLICY IF EXISTS "Delete Access" ON storage.objects;
END $$;

-- Create new policies
DO $$
BEGIN
  -- Allow public read access to all photos
  CREATE POLICY "Public Access"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'patient-photos');

  -- Restrict upload access to authenticated users with patient ownership
  CREATE POLICY "Upload Access"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  );

  -- Restrict update access to authenticated users with patient ownership
  CREATE POLICY "Update Access"
  ON storage.objects FOR UPDATE
  TO public
  USING (
    bucket_id = 'patient-photos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  );

  -- Restrict delete access to authenticated users with patient ownership
  CREATE POLICY "Delete Access"
  ON storage.objects FOR DELETE
  TO public
  USING (
    bucket_id = 'patient-photos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  );
END $$;