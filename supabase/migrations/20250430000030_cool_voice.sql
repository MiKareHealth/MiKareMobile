/*
  # Add symptoms tracking

  1. New Tables
    - `symptoms`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references patients)
      - `description` (text)
      - `start_date` (date)
      - `end_date` (date, nullable)
      - `severity` (enum)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users to manage their patients' symptoms
*/

-- Create severity enum
create type symptom_severity as enum ('Mild', 'Moderate', 'Severe');

-- Create symptoms table
create table if not exists public.symptoms (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.patients(id) on delete cascade not null,
  description text not null,
  start_date date not null,
  end_date date,
  severity symptom_severity not null,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.symptoms enable row level security;

-- Create policies
create policy "Users can view symptoms for their patients"
  on symptoms for select
  using (
    exists (
      select 1 from patients
      where patients.id = symptoms.profile_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can create symptoms for their patients"
  on symptoms for insert
  with check (
    exists (
      select 1 from patients
      where patients.id = symptoms.profile_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can update symptoms for their patients"
  on symptoms for update
  using (
    exists (
      select 1 from patients
      where patients.id = symptoms.profile_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can delete symptoms for their patients"
  on symptoms for delete
  using (
    exists (
      select 1 from patients
      where patients.id = symptoms.profile_id
      and patients.user_id = auth.uid()
    )
  );

-- Create updated_at trigger
create trigger handle_symptoms_updated_at
  before update on symptoms
  for each row
  execute procedure public.handle_updated_at();