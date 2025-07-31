/*
  # Create diary entries table and types

  1. New Types
    - `diary_entry_type` enum for categorizing entries

  2. New Tables
    - `diary_entries`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references patients)
      - `entry_type` (diary_entry_type enum)
      - `title` (text)
      - `date` (date)
      - `notes` (text)
      - `severity` (text, optional)
      - `attendees` (text array)
      - `file_url` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create entry type enum
create type diary_entry_type as enum (
  'Appointment',
  'Diagnosis',
  'Note',
  'Treatment',
  'Other'
);

-- Create diary entries table
create table if not exists public.diary_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.patients(id) on delete cascade not null,
  entry_type diary_entry_type not null,
  title text not null,
  date date not null,
  notes text,
  severity text,
  attendees text[] default array[]::text[],
  file_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.diary_entries enable row level security;

-- Create policies
create policy "Users can view diary entries for their patients"
  on diary_entries for select
  using (
    exists (
      select 1 from patients
      where patients.id = diary_entries.profile_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can create diary entries for their patients"
  on diary_entries for insert
  with check (
    exists (
      select 1 from patients
      where patients.id = diary_entries.profile_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can update diary entries for their patients"
  on diary_entries for update
  using (
    exists (
      select 1 from patients
      where patients.id = diary_entries.profile_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can delete diary entries for their patients"
  on diary_entries for delete
  using (
    exists (
      select 1 from patients
      where patients.id = diary_entries.profile_id
      and patients.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
create trigger handle_diary_entries_updated_at
  before update on diary_entries
  for each row
  execute procedure public.handle_updated_at();

-- Add diary_entry_id to patient_documents
alter table public.patient_documents
add column diary_entry_id uuid references public.diary_entries(id) on delete set null;