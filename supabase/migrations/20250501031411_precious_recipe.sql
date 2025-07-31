/*
  # Add storage policies for patient photos

  1. Storage Bucket
    - Create 'patient-photos' bucket if it doesn't exist
    - Enable RLS on the bucket
  
  2. Storage Policies
    - Allow users to upload photos for their patients
    - Allow users to read photos for their patients
    - Allow users to update photos for their patients
    - Allow users to delete photos for their patients
*/

-- Create the storage bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'patient-photos'
  ) THEN
    INSERT INTO storage.buckets (id, name)
    VALUES ('patient-photos', 'patient-photos');
  END IF;
END $$;

-- Enable RLS on the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the storage bucket
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload photos for their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read photos for their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update photos for their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete photos for their patients" ON storage.objects;
END $$;

-- Policy for uploading photos
CREATE POLICY "Users can upload photos for their patients"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'patient-photos' AND
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id::text = (regexp_match(name, '^([^-]+)'))[1]
    AND patients.user_id = auth.uid()
  )
);

-- Policy for reading photos
CREATE POLICY "Users can read photos for their patients"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'patient-photos' AND
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id::text = (regexp_match(name, '^([^-]+)'))[1]
    AND patients.user_id = auth.uid()
  )
);

-- Policy for updating photos
CREATE POLICY "Users can update photos for their patients"
ON storage.objects FOR UPDATE TO public
USING (
  bucket_id = 'patient-photos' AND
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id::text = (regexp_match(name, '^([^-]+)'))[1]
    AND patients.user_id = auth.uid()
  )
);

-- Policy for deleting photos
CREATE POLICY "Users can delete photos for their patients"
ON storage.objects FOR DELETE TO public
USING (
  bucket_id = 'patient-photos' AND
  EXISTS (
    SELECT 1 FROM public.patients
    WHERE patients.id::text = (regexp_match(name, '^([^-]+)'))[1]
    AND patients.user_id = auth.uid()
  )
);

/*
  # Update RLS policies for patients table with diagnostic logging

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper permissions
    - Add diagnostic logging function
    - Ensure policies work across all regions
*/

-- Create diagnostic logging function
CREATE OR REPLACE FUNCTION public.log_rls_violation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.rls_logs (
    table_name,
    operation,
    user_id,
    attempted_user_id,
    error_message
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    NEW.user_id,
    'RLS policy violation'
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create logging table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.rls_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  attempted_user_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on logging table
ALTER TABLE public.rls_logs ENABLE ROW LEVEL SECURITY;

-- Grant access to logging table
GRANT ALL ON public.rls_logs TO authenticated, anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can create patients" ON public.patients;
DROP POLICY IF EXISTS "Users can update their own patients" ON public.patients;
DROP POLICY IF EXISTS "Users can delete their own patients" ON public.patients;

-- Create new policies with proper permissions and logging
CREATE POLICY "Users can view their own patients"
  ON public.patients FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create patients"
  ON public.patients FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients"
  ON public.patients FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients"
  ON public.patients FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Create trigger for RLS violation logging
DROP TRIGGER IF EXISTS log_patients_rls_violation ON public.patients;
CREATE TRIGGER log_patients_rls_violation
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW
  WHEN (auth.uid() IS DISTINCT FROM user_id)
  EXECUTE FUNCTION public.log_rls_violation();

-- Grant necessary permissions
GRANT ALL ON public.patients TO authenticated, anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Create function to check RLS status
CREATE OR REPLACE FUNCTION public.check_rls_status()
RETURNS TABLE (
  table_name TEXT,
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
    schemaname || '.' || tablename as table_name,
    policyname as policy_name,
    roles::TEXT[],
    permissive,
    cmd::TEXT as command,
    qual::TEXT,
    with_check::TEXT
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'patients';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on check function
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated, anon;