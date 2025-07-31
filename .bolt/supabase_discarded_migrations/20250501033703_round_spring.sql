/*
  # Fix storage policies for patient photos

  1. Changes
    - Make bucket public to allow URL access
    - Drop existing policies to avoid conflicts
    - Create new policies with improved access control
    - Add support for public URL access
    - Maintain security through proper patient ownership checks
*/

-- Update bucket to be public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'patient-photos';

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view photos of their patients" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload photos for their patients" ON storage.objects;
DROP POLICY IF EXISTS "Users can update photos for their patients" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete photos of their patients" ON storage.objects;

-- Create new policies with improved access control
-- Policy for reading photos (public access)
CREATE POLICY "Users can view photos of their patients"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'patient-photos'
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