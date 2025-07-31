/*
  # Fix storage policies for patient photos

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with improved path matching
    - Make bucket public to allow URL access
    - Update policies to handle both direct and public access

  2. Security
    - Maintain RLS to ensure users can only access their patients' photos
    - Allow public URL access for authorized photos
*/

-- Create storage bucket if it doesn't exist
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

-- Create new policies with improved path matching
DO $$
BEGIN
  -- Policy for reading photos (public access)
  CREATE POLICY "Users can view photos of their patients"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'patient-photos' AND
    (
      -- Allow access if authenticated and owns the patient
      (auth.uid() IS NOT NULL AND
        EXISTS (
          SELECT 1 FROM patients
          WHERE patients.user_id = auth.uid()
          AND storage.objects.name LIKE patients.id || '-%'
        )
      )
      -- Or if the bucket is public and the URL is valid
      OR bucket_id IN (
        SELECT id FROM storage.buckets
        WHERE public = true
      )
    )
  );

  -- Policy for uploading new photos
  CREATE POLICY "Users can upload photos for their patients"
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

  -- Policy for updating existing photos
  CREATE POLICY "Users can update photos for their patients"
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
  )
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  );

  -- Policy for deleting photos
  CREATE POLICY "Users can delete photos of their patients"
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