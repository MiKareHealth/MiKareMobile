/*
  # Create patients table and storage

  1. New Tables
    - `patients`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `full_name` (text)
      - `dob` (date)
      - `gender` (enum)
      - `relationship` (text)
      - `country` (text)
      - `address` (text)
      - `phone_number` (text)
      - `photo_url` (text)
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Storage
    - Create patient-photos bucket
    - Set up storage policies

  3. Security
    - Enable RLS on patients table
    - Add policies for authenticated users
*/

-- Create gender enum type
create type patient_gender as enum ('Male', 'Female', 'Other');

-- Create patients table
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  full_name text not null,
  dob date not null,
  gender patient_gender not null,
  relationship text not null,
  country text not null,
  address text not null,
  phone_number text not null,
  photo_url text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Enable RLS
alter table public.patients enable row level security;

-- Create policies
create policy "Users can view their own patients"
  on patients for select
  using (auth.uid() = user_id);

create policy "Users can create patients"
  on patients for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own patients"
  on patients for update
  using (auth.uid() = user_id);

create policy "Users can delete their own patients"
  on patients for delete
  using (auth.uid() = user_id);

-- Create updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

create trigger handle_patients_updated_at
  before update on patients
  for each row
  execute procedure public.handle_updated_at();

-- Create storage bucket
insert into storage.buckets (id, name)
values ('patient-photos', 'patient-photos')
on conflict do nothing;

-- Set up storage policies
create policy "Users can upload patient photos"
  on storage.objects for insert
  with check (
    bucket_id = 'patient-photos' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can update their patient photos"
  on storage.objects for update
  using (
    bucket_id = 'patient-photos' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can read their patient photos"
  on storage.objects for select
  using (
    bucket_id = 'patient-photos' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );

create policy "Users can delete their patient photos"
  on storage.objects for delete
  using (
    bucket_id = 'patient-photos' and
    auth.uid() = (storage.foldername(name))[1]::uuid
  );