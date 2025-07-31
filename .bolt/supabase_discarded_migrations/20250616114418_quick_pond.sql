/*
  # Complete US Demo User Setup Script
  
  This script creates a complete demo user setup for the US database.
  It includes the user, profile, sample patients, and demo data.
  
  IMPORTANT: You still need to get the correct password hash manually:
  1. Create a temporary user through Supabase Auth with password 'demo123'
  2. Copy the encrypted_password from that user
  3. Replace 'REPLACE_WITH_ACTUAL_BCRYPT_HASH_FOR_demo123' below
  4. Delete the temporary user
*/

-- First, ensure we have the auth user with correct hash
-- Replace 'REPLACE_WITH_ACTUAL_BCRYPT_HASH_FOR_demo123' with the real bcrypt hash
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'demo@example.com',
  'REPLACE_WITH_ACTUAL_BCRYPT_HASH_FOR_demo123',
  now(),
  null,
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
) ON CONFLICT (id) DO UPDATE SET
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  updated_at = now();

-- Create profile for demo user
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  address,
  phone_number,
  timezone,
  time_format,
  plan_type,
  last_login,
  preferred_session_length,
  onboard_complete,
  show_splash,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo_user_us',
  'Demo User (US)',
  '123 Main Street, New York, NY 10001, USA',
  '+1 (555) 123-4567',
  'America/New_York',
  '12h',
  'Free',
  now(),
  30,
  true,
  false,
  now()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  address = EXCLUDED.address,
  phone_number = EXCLUDED.phone_number,
  timezone = EXCLUDED.timezone,
  time_format = EXCLUDED.time_format,
  onboard_complete = EXCLUDED.onboard_complete,
  show_splash = EXCLUDED.show_splash,
  updated_at = now();

-- Create sample patients
INSERT INTO public.patients (
  id,
  user_id,
  full_name,
  dob,
  gender,
  relationship,
  country,
  address,
  phone_number,
  notes,
  created_at,
  updated_at
) VALUES 
(
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Sarah Johnson',
  '1985-03-15',
  'Female',
  'Self',
  'United States',
  '123 Main Street, New York, NY 10001, USA',
  '+1 (555) 123-4567',
  'Primary patient - managing chronic conditions',
  now(),
  now()
),
(
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Michael Johnson',
  '2010-08-22',
  'Male',
  'Child',
  'United States',
  '123 Main Street, New York, NY 10001, USA',
  '+1 (555) 123-4567',
  'Son - pediatric health tracking',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  dob = EXCLUDED.dob,
  gender = EXCLUDED.gender,
  relationship = EXCLUDED.relationship,
  country = EXCLUDED.country,
  address = EXCLUDED.address,
  phone_number = EXCLUDED.phone_number,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Create sample diary entries
INSERT INTO public.diary_entries (
  id,
  profile_id,
  entry_type,
  title,
  date,
  notes,
  created_at,
  updated_at
) VALUES
(
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Appointment',
  'Annual Physical Exam',
  CURRENT_DATE - INTERVAL '7 days',
  'Routine annual checkup. Blood pressure normal, cholesterol slightly elevated. Doctor recommended increasing exercise and monitoring diet.',
  now(),
  now()
),
(
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Symptom',
  'Mild Headache',
  CURRENT_DATE - INTERVAL '3 days',
  'Experienced mild headache in the afternoon. Possibly related to screen time. Took a break and symptoms improved.',
  now(),
  now()
),
(
  '20000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000002',
  'Note',
  'Growth Check',
  CURRENT_DATE - INTERVAL '14 days',
  'Monthly height and weight check. Growing normally according to pediatric charts.',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Create sample symptoms
INSERT INTO public.symptoms (
  id,
  profile_id,
  description,
  start_date,
  severity,
  notes,
  created_at,
  updated_at
) VALUES
(
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Occasional headaches',
  CURRENT_DATE - INTERVAL '30 days',
  'Mild',
  'Usually occurs in the afternoon, possibly related to computer work',
  now(),
  now()
),
(
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'Lower back stiffness',
  CURRENT_DATE - INTERVAL '14 days',
  'Moderate',
  'Started after long work sessions, improves with stretching',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Create sample medications
INSERT INTO public.medications (
  id,
  profile_id,
  medication_name,
  start_date,
  dosage,
  status,
  prescribed_by,
  notes,
  created_at,
  updated_at
) VALUES
(
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'Multivitamin',
  CURRENT_DATE - INTERVAL '60 days',
  'One tablet daily',
  'Active',
  'Dr. Smith',
  'General health maintenance',
  now(),
  now()
),
(
  '40000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  'Children''s Vitamin D',
  CURRENT_DATE - INTERVAL '30 days',
  '400 IU daily',
  'Active',
  'Dr. Johnson',
  'Pediatric vitamin D supplementation',
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  medication_name = EXCLUDED.medication_name,
  dosage = EXCLUDED.dosage,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = now();

-- Create sample mood entries
INSERT INTO public.mood_entries (
  id,
  profile_id,
  date,
  body,
  mind,
  sleep,
  mood,
  notes,
  created_at
) VALUES
(
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '1 day',
  4,
  4,
  3,
  4,
  'Good day overall, sleep could be better',
  now()
),
(
  '50000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '2 days',
  3,
  4,
  4,
  4,
  'Feeling well, good sleep last night',
  now()
),
(
  '50000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '3 days',
  4,
  5,
  4,
  5,
  'Excellent day, very productive',
  now()
) ON CONFLICT (profile_id, date) DO UPDATE SET
  body = EXCLUDED.body,
  mind = EXCLUDED.mind,
  sleep = EXCLUDED.sleep,
  mood = EXCLUDED.mood,
  notes = EXCLUDED.notes;

-- Create a sample user session
INSERT INTO public.user_sessions (
  id,
  user_id,
  login_time,
  session_length_minutes,
  is_active,
  created_at
) VALUES (
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  now() - INTERVAL '2 hours',
  30,
  false,
  now()
) ON CONFLICT (id) DO UPDATE SET
  login_time = EXCLUDED.login_time,
  is_active = EXCLUDED.is_active;

SELECT 'Demo user setup completed successfully for US database!' as message;
SELECT 'IMPORTANT: Remember to replace the password hash with the actual bcrypt hash for demo123' as warning;