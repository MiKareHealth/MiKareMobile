/*
  # Add audio_file_url to diary_entries table

  1. Changes
    - Add audio_file_url column to diary_entries table
    - This column will store URLs to audio recordings associated with diary entries
  
  2. Purpose
    - Support the audio recording and transcription functionality
    - Allow tracking of audio files separate from other file attachments
*/

-- Add audio_file_url column to diary_entries table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'diary_entries' AND column_name = 'audio_file_url'
  ) THEN
    ALTER TABLE diary_entries ADD COLUMN audio_file_url text;
  END IF;
END $$;