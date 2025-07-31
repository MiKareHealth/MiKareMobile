/*
  # Fix storage policies for patient photos

  1. Changes
    - Create patient-photos bucket if it doesn't exist
    - Enable RLS on storage.objects
    - Drop existing policies to avoid conflicts
    - Create new policies for managing patient photos
*/

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('patient-photos', 'patient-photos', true)
  ON CONFLICT (id) DO NOTHING;
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

-- Create policies for the storage bucket
DO $$
BEGIN
  -- Policy for reading photos (allows public access to photos of user's patients)
  CREATE POLICY "Users can view photos of their patients"
  ON storage.objects FOR SELECT
  TO public
  USING (
    bucket_id = 'patient-photos' AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  );

  -- Policy for uploading new photos
  CREATE POLICY "Users can upload photos for their patients"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'patient-photos' AND
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
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  )
  WITH CHECK (
    bucket_id = 'patient-photos' AND
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
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '-%'
    )
  );
END $$;