/*
  # Update storage policies for patient photos

  1. Changes
    - Create patient-photos bucket if it doesn't exist
    - Add policies for uploading and reading patient photos
    - Check for existing policies before creating new ones

  2. Security
    - Ensure users can only access photos for their own patients
    - Validate patient ownership through RLS policies
*/

DO $$
BEGIN
  -- Create bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('patient-photos', 'patient-photos', false)
  ON CONFLICT (id) DO NOTHING;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can upload photos for their patients" ON storage.objects;
  DROP POLICY IF EXISTS "Users can read photos for their patients" ON storage.objects;

  -- Create policy to allow users to upload photos for their patients
  CREATE POLICY "Users can upload photos for their patients"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (
    bucket_id = 'patient-photos' AND
    (EXISTS (
      SELECT 1 FROM patients
      WHERE id::text = SPLIT_PART(name, '-', 1)
      AND user_id = auth.uid()
    ))
  );

  -- Create policy to allow users to read photos for their patients
  CREATE POLICY "Users can read photos for their patients"
  ON storage.objects FOR SELECT TO public
  USING (
    bucket_id = 'patient-photos' AND
    (EXISTS (
      SELECT 1 FROM patients
      WHERE id::text = SPLIT_PART(name, '-', 1)
      AND user_id = auth.uid()
    ))
  );
END $$;