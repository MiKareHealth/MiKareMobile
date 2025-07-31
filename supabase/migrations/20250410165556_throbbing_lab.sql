/*
  # Add patient activities and documents tables

  1. New Tables
    - `patient_activities`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `title` (text)
      - `activity_type` (text)
      - `activity_date` (timestamptz)
      - `follow_up_date` (timestamptz)
      - `notes` (text)
      - `structured_outcome` (jsonb)
      - `created_by` (uuid, references auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `patient_documents`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, references patients)
      - `activity_id` (uuid, references patient_activities)
      - `file_name` (text)
      - `file_type` (text)
      - `file_size` (bigint)
      - `file_url` (text)
      - `description` (text)
      - `uploaded_by` (uuid, references auth.users)
      - `uploaded_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create patient_activities table
create table if not exists public.patient_activities (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  title text not null,
  activity_type text not null,
  activity_date timestamptz not null,
  follow_up_date timestamptz,
  notes text,
  structured_outcome jsonb,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Create patient_documents table
create table if not exists public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients(id) on delete cascade not null,
  activity_id uuid references public.patient_activities(id) on delete set null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  file_url text not null,
  description text,
  uploaded_by uuid references auth.users(id) not null,
  uploaded_at timestamptz default now() not null
);

-- Enable RLS
alter table public.patient_activities enable row level security;
alter table public.patient_documents enable row level security;

-- Create policies for patient_activities
create policy "Users can view activities for their patients"
  on patient_activities for select
  using (
    exists (
      select 1 from patients
      where patients.id = patient_activities.patient_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can create activities for their patients"
  on patient_activities for insert
  with check (
    exists (
      select 1 from patients
      where patients.id = patient_activities.patient_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can update activities for their patients"
  on patient_activities for update
  using (
    exists (
      select 1 from patients
      where patients.id = patient_activities.patient_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can delete activities for their patients"
  on patient_activities for delete
  using (
    exists (
      select 1 from patients
      where patients.id = patient_activities.patient_id
      and patients.user_id = auth.uid()
    )
  );

-- Create policies for patient_documents
create policy "Users can view documents for their patients"
  on patient_documents for select
  using (
    exists (
      select 1 from patients
      where patients.id = patient_documents.patient_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can upload documents for their patients"
  on patient_documents for insert
  with check (
    exists (
      select 1 from patients
      where patients.id = patient_documents.patient_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can update documents for their patients"
  on patient_documents for update
  using (
    exists (
      select 1 from patients
      where patients.id = patient_documents.patient_id
      and patients.user_id = auth.uid()
    )
  );

create policy "Users can delete documents for their patients"
  on patient_documents for delete
  using (
    exists (
      select 1 from patients
      where patients.id = patient_documents.patient_id
      and patients.user_id = auth.uid()
    )
  );

-- Create updated_at trigger for patient_activities
create trigger handle_patient_activities_updated_at
  before update on patient_activities
  for each row
  execute procedure public.handle_updated_at();

-- Create storage bucket for patient documents
insert into storage.buckets (id, name)
values ('patient-documents', 'patient-documents')
on conflict do nothing;

-- Set up storage policies for patient documents
create policy "Users can upload patient documents"
  on storage.objects for insert
  with check (
    bucket_id = 'patient-documents' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can update their patient documents"
  on storage.objects for update
  using (
    bucket_id = 'patient-documents' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can read their patient documents"
  on storage.objects for select
  using (
    bucket_id = 'patient-documents' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can delete their patient documents"
  on storage.objects for delete
  using (
    bucket_id = 'patient-documents' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );