/*
  # Fix storage policies for patient photos

  1. Changes
    - Create patient-photos bucket if it doesn't exist
    - Set up RLS policies for the bucket
    - Grant necessary permissions
*/

-- Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('patient-photos', 'patient-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload their own patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own patient photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own patient photos" ON storage.objects;

-- Create policies for the patient-photos bucket
CREATE POLICY "Users can upload their own patient photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'patient-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own patient photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'patient-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own patient photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'patient-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own patient photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'patient-photos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create function to check storage policies
CREATE OR REPLACE FUNCTION public.check_storage_policies()
RETURNS TABLE (
  bucket_id TEXT,
  policy_name TEXT,
  roles TEXT[],
  permissive BOOLEAN,
  command TEXT,
  qual TEXT,
  with_check TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bucket_id::TEXT,
    policyname as policy_name,
    roles::TEXT[],
    permissive,
    cmd::TEXT as command,
    qual::TEXT,
    with_check::TEXT
  FROM pg_policies
  WHERE schemaname = 'storage'
  AND tablename = 'objects';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the check function
GRANT EXECUTE ON FUNCTION public.check_storage_policies() TO authenticated; 