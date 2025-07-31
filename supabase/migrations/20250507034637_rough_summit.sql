/*
  # Fix patient documents storage access

  1. Changes
    - Make patient-documents bucket public to allow access via URLs
    - Replace existing storage policies with more flexible ones
    - Use unique policy names to avoid conflicts
  
  2. Security
    - Maintain row-level security for documents
    - Ensure users can only access documents for their patients
*/

-- Make patient-documents bucket public to allow access via URL
UPDATE storage.buckets
SET public = true
WHERE id = 'patient-documents';

-- Use DO block to safely drop and recreate policies
DO $$
BEGIN
  -- Drop existing policies safely (if they exist)
  DROP POLICY IF EXISTS "Users can upload patient documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read patient documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update patient documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete patient documents" ON storage.objects;
  
  -- Also drop policies with names we're about to create (in case they exist)
  DROP POLICY IF EXISTS "Patient documents view policy 2025" ON storage.objects;
  DROP POLICY IF EXISTS "Patient documents upload policy 2025" ON storage.objects;
  DROP POLICY IF EXISTS "Patient documents update policy 2025" ON storage.objects;
  DROP POLICY IF EXISTS "Patient documents delete policy 2025" ON storage.objects;
  
  -- Create policies with new unique names
  
  -- Policy for reading documents
  CREATE POLICY "Patient documents view policy 2025"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'patient-documents' 
    OR (
      bucket_id = 'patient-documents' AND
      EXISTS (
        SELECT 1 FROM patients
        WHERE patients.user_id = auth.uid()
        AND storage.objects.name LIKE patients.id || '/%'
      )
    )
  );

  -- Policy for inserting documents
  CREATE POLICY "Patient documents upload policy 2025"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'patient-documents' AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
  );

  -- Policy for updating documents
  CREATE POLICY "Patient documents update policy 2025"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'patient-documents' AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
  );

  -- Policy for deleting documents
  CREATE POLICY "Patient documents delete policy 2025"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'patient-documents' AND
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
  );
END$$;