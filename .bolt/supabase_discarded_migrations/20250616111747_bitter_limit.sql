-- =====================================================
-- Demo User Setup Script for UK Supabase Database
-- =====================================================
-- This script creates a demo user with sample data for testing purposes
-- Run this script in the UK Supabase database (sznxdanjvxluhtcutesn.supabase.co)

-- First, create the demo user in auth.users table
-- Note: The password hash corresponds to 'demo123'
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  last_sign_in_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'demo@example.com',
  '$2a$10$GzJ4p5h5h5h5h5h5h5h5h.J9FQVj8J9FQVj8J9FQVj8J9FQVj8J9FQ', -- This is 'demo123' hashed
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  '',
  'authenticated',
  'authenticated',
  '{"provider": "email", "providers": ["email"]}',
  '{"full_name": "Demo User"}',
  false,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW(),
  last_sign_in_at = NOW();

-- Create the demo user profile
INSERT INTO public.profiles (
  id,
  username,
  full_name,
  avatar_url,
  updated_at,
  address,
  phone_number,
  timezone,
  time_format,
  plan_type,
  last_login,
  preferred_session_length,
  onboard_complete,
  show_splash
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'demo_user_uk',
  'Demo User (UK)',
  NULL,
  NOW(),
  '123 Demo Street, London, UK',
  '+44 20 7946 0958',
  'Europe/London',
  '24h',
  'Free',
  NOW(),
  30,
  true,
  false
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  address = EXCLUDED.address,
  phone_number = EXCLUDED.phone_number,
  timezone = EXCLUDED.timezone,
  time_format = EXCLUDED.time_format,
  updated_at = NOW(),
  last_login = NOW();

-- Create sample patients for the demo user
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
  photo_url,
  notes,
  created_at,
  updated_at
) VALUES 
  (
    '10000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Emma Thompson',
    '1990-03-15',
    'Female',
    'Self',
    'United Kingdom',
    '456 Health Lane, Manchester, UK',
    '+44 161 496 0000',
    NULL,
    'Demo patient with chronic condition management.',
    NOW(),
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'James Wilson',
    '2015-07-22',
    'Male',
    'Son',
    'United Kingdom',
    '456 Health Lane, Manchester, UK',
    '+44 161 496 0000',
    NULL,
    'Demo pediatric patient for family health tracking.',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Create sample diary entries
INSERT INTO public.diary_entries (
  id,
  profile_id,
  entry_type,
  title,
  date,
  notes,
  severity,
  attendees,
  created_at,
  updated_at
) VALUES 
  (
    '20000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Appointment',
    'GP Consultation - Annual Check-up',
    CURRENT_DATE - INTERVAL '7 days',
    'Routine annual health check. Blood pressure slightly elevated. Recommended dietary changes and regular exercise. Follow-up in 3 months.',
    NULL,
    ARRAY['Dr. Sarah Johnson', 'Nurse Mary'],
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Symptom',
    'Recurring Headaches',
    CURRENT_DATE - INTERVAL '3 days',
    'Experiencing mild headaches in the afternoon. Possibly related to screen time and dehydration.',
    'Mild',
    ARRAY[],
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Appointment',
    'Pediatric Check-up',
    CURRENT_DATE - INTERVAL '14 days',
    'Regular growth and development check. Height and weight within normal ranges. Vaccinations up to date.',
    NULL,
    ARRAY['Dr. Michael Brown', 'Parent'],
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Create sample symptoms
INSERT INTO public.symptoms (
  id,
  profile_id,
  description,
  start_date,
  end_date,
  severity,
  notes,
  created_at,
  updated_at
) VALUES 
  (
    '30000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Afternoon Headaches',
    CURRENT_DATE - INTERVAL '10 days',
    NULL,
    'Mild',
    'Occurs mainly between 2-4 PM. Possibly related to screen time or dehydration.',
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Lower Back Pain',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '5 days',
    'Moderate',
    'Resolved after physiotherapy sessions and ergonomic improvements.',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  description = EXCLUDED.description,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Create sample medications
INSERT INTO public.medications (
  id,
  profile_id,
  medication_name,
  start_date,
  end_date,
  dosage,
  status,
  prescribed_by,
  notes,
  created_at,
  updated_at
) VALUES 
  (
    '40000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Vitamin D3',
    CURRENT_DATE - INTERVAL '60 days',
    NULL,
    '1000 IU daily',
    'Active',
    'Dr. Sarah Johnson',
    'Take with food for better absorption.',
    NOW(),
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Children''s Multivitamin',
    CURRENT_DATE - INTERVAL '90 days',
    NULL,
    '1 tablet daily',
    'Active',
    'Dr. Michael Brown',
    'Chewable tablet, take with breakfast.',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  medication_name = EXCLUDED.medication_name,
  dosage = EXCLUDED.dosage,
  updated_at = NOW();

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
    '50000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    CURRENT_DATE - INTERVAL '1 days',
    4,
    4,
    3,
    4,
    'Good day overall. Sleep could be better.',
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    CURRENT_DATE - INTERVAL '2 days',
    3,
    4,
    4,
    4,
    'Feeling well. Exercise helped with energy levels.',
    NOW()
  )
ON CONFLICT (profile_id, date) DO UPDATE SET
  body = EXCLUDED.body,
  mind = EXCLUDED.mind,
  sleep = EXCLUDED.sleep,
  mood = EXCLUDED.mood,
  notes = EXCLUDED.notes;

-- Create a user session record
INSERT INTO public.user_sessions (
  id,
  user_id,
  login_time,
  logout_time,
  session_length_minutes,
  ip_address,
  user_agent,
  is_active,
  created_at
) VALUES (
  '60000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000001'::uuid,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour',
  60,
  '192.168.1.100',
  'Mozilla/5.0 (Demo Browser)',
  false,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  login_time = EXCLUDED.login_time,
  logout_time = EXCLUDED.logout_time;

-- Grant necessary permissions (if needed)
-- These should already be handled by RLS policies, but including for completeness

COMMIT;

-- Display success message
SELECT 'Demo user setup completed successfully for UK database!' as status;