/*
  # Fix Storage RLS Policies for Patient Documents

  Problem: Current RLS policies are preventing file listing and access
  Solution: Simplify and fix the policies to allow proper file operations

  Changes:
  1. Fix the SELECT policy to properly allow file listing
  2. Ensure metadata-based access works correctly
  3. Simplify policy logic to avoid conflicts
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Patient documents view policy 2025" ON storage.objects;
DROP POLICY IF EXISTS "Patient documents upload policy 2025" ON storage.objects;
DROP POLICY IF EXISTS "Patient documents update policy 2025" ON storage.objects;
DROP POLICY IF EXISTS "Patient documents delete policy 2025" ON storage.objects;

-- Create corrected policies

-- Policy for reading/listing documents
CREATE POLICY "Patient documents view policy fixed"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'patient-documents' AND
  (
    -- Allow access if file path starts with user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
    OR
    -- Allow access if metadata contains user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND (storage.objects.metadata->>'patient_id')::uuid = patients.id
    )
  )
);

-- Policy for uploading documents
CREATE POLICY "Patient documents upload policy fixed"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'patient-documents' AND
  (
    -- Allow upload if file path starts with user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
    OR
    -- Allow upload if metadata contains user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND (storage.objects.metadata->>'patient_id')::uuid = patients.id
    )
  )
);

-- Policy for updating documents
CREATE POLICY "Patient documents update policy fixed"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'patient-documents' AND
  (
    -- Allow update if file path starts with user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
    OR
    -- Allow update if metadata contains user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND (storage.objects.metadata->>'patient_id')::uuid = patients.id
    )
  )
);

-- Policy for deleting documents
CREATE POLICY "Patient documents delete policy fixed"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'patient-documents' AND
  (
    -- Allow delete if file path starts with user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND storage.objects.name LIKE patients.id || '/%'
    )
    OR
    -- Allow delete if metadata contains user's patient ID
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.user_id = auth.uid()
      AND (storage.objects.metadata->>'patient_id')::uuid = patients.id
    )
  )
); 