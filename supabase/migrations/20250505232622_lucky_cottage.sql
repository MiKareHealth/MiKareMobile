/*
  # Add AI diary entry type

  1. Changes
    - Add 'AI' to diary_entry_type enum
    - Add AI-specific columns to diary_entries table
*/

-- Add AI to diary_entry_type enum
ALTER TYPE diary_entry_type ADD VALUE IF NOT EXISTS 'AI';

-- Add AI-specific columns
ALTER TABLE diary_entries
ADD COLUMN IF NOT EXISTS ai_type text,
ADD COLUMN IF NOT EXISTS source_entries text[];