/*
  # Add audio file URL field to diary entries

  1. Changes
    - Add audio_file_url column to diary_entries table
    - This allows direct tracking of audio recordings associated with diary entries
    - Improves audio recording and transcription workflow

  2. Purpose
    - Support dedicated audio recording storage and management
    - Separate audio files from general document uploads
    - Provide better tracking for transcription feature
*/

-- Add audio_file_url column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'audio_file_url'
  ) THEN
    ALTER TABLE public.diary_entries 
    ADD COLUMN audio_file_url text;
  END IF;
END $$;