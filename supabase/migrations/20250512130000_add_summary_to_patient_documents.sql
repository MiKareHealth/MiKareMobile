/*
  # Add summary column to patient_documents table

  1. Changes
    - Add summary text column to patient_documents table
    - This column will store AI-generated summaries of documents
    - Default value is null for existing records

  2. Security
    - No changes to security model
    - Summary field follows same RLS policies as other fields
*/

-- Add summary column to patient_documents table
DO $$
BEGIN
  -- Add summary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'patient_documents' AND column_name = 'summary'
  ) THEN
    ALTER TABLE patient_documents ADD COLUMN summary text;
  END IF;
END $$; 