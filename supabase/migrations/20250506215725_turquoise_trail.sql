/*
  # Add medications table and types

  1. New Types
    - `medication_status` enum for tracking if medication is active/inactive

  2. New Tables
    - `medications`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references patients)
      - `medication_name` (text)
      - `start_date` (date)
      - `end_date` (date, optional)
      - `dosage` (text)
      - `status` (medication_status)
      - `prescribed_by` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create medication status enum
CREATE TYPE medication_status AS ENUM ('Active', 'Inactive');

-- Create medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  medication_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  dosage text NOT NULL,
  status medication_status NOT NULL,
  prescribed_by text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view medications for their patients"
  ON medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create medications for their patients"
  ON medications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update medications for their patients"
  ON medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete medications for their patients"
  ON medications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
CREATE TRIGGER handle_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();