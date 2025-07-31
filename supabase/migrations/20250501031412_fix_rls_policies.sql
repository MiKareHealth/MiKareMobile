/*
  # Fix RLS policies for patients table

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create new policies with proper permissions
    - Add diagnostic logging
    - Ensure policies work across all regions
*/

-- Create diagnostic logging function if it doesn't exist
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
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.user_id
      ELSE NEW.user_id
    END,
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

-- Create new policies with proper permissions
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

-- Create triggers for RLS violation logging
DROP TRIGGER IF EXISTS log_patients_rls_violation_insert ON public.patients;
DROP TRIGGER IF EXISTS log_patients_rls_violation_update ON public.patients;
DROP TRIGGER IF EXISTS log_patients_rls_violation_delete ON public.patients;

-- Trigger for INSERT
CREATE TRIGGER log_patients_rls_violation_insert
  AFTER INSERT ON public.patients
  FOR EACH ROW
  WHEN (auth.uid() IS DISTINCT FROM NEW.user_id)
  EXECUTE FUNCTION public.log_rls_violation();

-- Trigger for UPDATE
CREATE TRIGGER log_patients_rls_violation_update
  AFTER UPDATE ON public.patients
  FOR EACH ROW
  WHEN (auth.uid() IS DISTINCT FROM NEW.user_id)
  EXECUTE FUNCTION public.log_rls_violation();

-- Trigger for DELETE
CREATE TRIGGER log_patients_rls_violation_delete
  AFTER DELETE ON public.patients
  FOR EACH ROW
  WHEN (auth.uid() IS DISTINCT FROM OLD.user_id)
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

-- Grant execute permission on the check function
GRANT EXECUTE ON FUNCTION public.check_rls_status() TO authenticated, anon; 