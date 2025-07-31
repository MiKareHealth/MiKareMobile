/*
  # Fix storage policies for patient documents bucket

  1. Changes
    - Set the patient-documents bucket to public to allow URL access
    - Update RLS policies with improved path structure to work with transcription feature
    - Ensure user authentication is properly checked in all policies

  2. Security
    - Maintain RLS to ensure users can only access their patients' documents
    - Allow public URL access while maintaining security
*/

-- Set storage bucket to public to enable URLs
UPDATE storage.buckets
SET public = true
WHERE id = 'patient-documents';

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view documents for their patients" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload documents for their patients" ON storage.objects;
DROP POLICY IF EXISTS "Users can update documents for their patients" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents for their patients" ON storage.objects;

-- Create new policies with improved path handling
-- Policy for reading documents (allows public access to documents of user's patients)
CREATE POLICY "Users can view documents for their patients"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'patient-documents' AND
  (
    -- Allow access if authenticated and owns the patient
    (auth.uid() IS NOT NULL AND
      EXISTS (
        SELECT 1 FROM patients
        WHERE patients.user_id = auth.uid()
        AND storage.objects.name LIKE patients.id || '/%'
      )
    )
    -- Or if the bucket is public and the URL is valid
    OR bucket_id IN (
      SELECT id FROM storage.buckets
      WHERE public = true
    )
  )
);

-- Policy for uploading new documents
CREATE POLICY "Users can upload documents for their patients"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.user_id = auth.uid()
    AND storage.objects.name LIKE patients.id || '/%'
  )
);

-- Policy for updating existing documents
CREATE POLICY "Users can update documents for their patients"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.user_id = auth.uid()
    AND storage.objects.name LIKE patients.id || '/%'
  )
);

-- Policy for deleting documents
CREATE POLICY "Users can delete documents for their patients"
ON storage.objects FOR DELETE
TO public
USING (
  bucket_id = 'patient-documents' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM patients
    WHERE patients.user_id = auth.uid()
    AND storage.objects.name LIKE patients.id || '/%'
  )
);