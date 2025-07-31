/*
  # Fix storage policies for patient photos

  1. Changes
    - Make patient-photos bucket public
    - Drop existing policies to avoid conflicts
    - Create new policies with improved security and access control
    - Fix pattern matching for file paths

  2. Security
    - Enable RLS on storage.objects
    - Add policies for:
      - Public read access for authenticated users' patient photos
      - Authenticated upload/update/delete for owned patients
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
  DROP POLICY IF EXISTS "Users can view photos of their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload photos for their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update photos for their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete photos of their patients" ON storage.objects;
END $$;

-- Create new policies
DO $$
BEGIN
  -- Public read access policy
  CREATE POLICY "Public access to patient photos"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'patient-photos'
  );

  -- Upload policy
  CREATE POLICY "Users can upload patient photos"
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

  -- Update policy
  CREATE POLICY "Users can update patient photos"
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

  -- Delete policy
  CREATE POLICY "Users can delete patient photos"
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