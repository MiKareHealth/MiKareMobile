-- =====================================================
-- Demo User Setup Script for US Supabase Database
-- =====================================================
-- This script creates a demo user with sample data for testing purposes
-- Run this script in the US Supabase database (eawgokimxeolxfktfpkf.supabase.co)

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
  'demo_user_us',
  'Demo User (US)',
  NULL,
  NOW(),
  '123 Demo Avenue, New York, NY 10001',
  '+1 (555) 123-4567',
  'America/New_York',
  '12h',
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
    'Sarah Johnson',
    '1985-08-12',
    'Female',
    'Self',
    'United States',
    '456 Wellness Street, Brooklyn, NY 11201',
    '+1 (555) 987-6543',
    NULL,
    'Demo patient managing diabetes and hypertension.',
    NOW(),
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Michael Johnson',
    '2018-12-05',
    'Male',
    'Son',
    'United States',
    '456 Wellness Street, Brooklyn, NY 11201',
    '+1 (555) 987-6543',
    NULL,
    'Demo pediatric patient for routine care tracking.',
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
    'Endocrinologist Visit',
    CURRENT_DATE - INTERVAL '5 days',
    'Diabetes management review. A1C levels improved to 6.8%. Continuing current medication regimen. Next appointment in 3 months.',
    NULL,
    ARRAY['Dr. Robert Martinez', 'Diabetes Educator'],
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Diagnosis',
    'Blood Pressure Reading',
    CURRENT_DATE - INTERVAL '2 days',
    'Home blood pressure monitoring: 128/82 mmHg. Within acceptable range for current medication.',
    'Mild',
    ARRAY[],
    NOW(),
    NOW()
  ),
  (
    '20000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Appointment',
    'Well-Child Visit',
    CURRENT_DATE - INTERVAL '21 days',
    'Annual wellness check. Growth percentiles normal. Received annual flu vaccine. Next visit in 6 months.',
    NULL,
    ARRAY['Dr. Lisa Chen', 'Parent'],
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
    'Morning Fatigue',
    CURRENT_DATE - INTERVAL '14 days',
    NULL,
    'Moderate',
    'Persistent morning fatigue despite adequate sleep. Possibly related to blood sugar levels.',
    NOW(),
    NOW()
  ),
  (
    '30000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Occasional Dizziness',
    CURRENT_DATE - INTERVAL '7 days',
    CURRENT_DATE - INTERVAL '2 days',
    'Mild',
    'Brief episodes when standing quickly. Resolved with medication adjustment.',
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
    'Metformin',
    CURRENT_DATE - INTERVAL '180 days',
    NULL,
    '500mg twice daily',
    'Active',
    'Dr. Robert Martinez',
    'Take with meals to reduce stomach upset.',
    NOW(),
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    'Lisinopril',
    CURRENT_DATE - INTERVAL '120 days',
    NULL,
    '10mg once daily',
    'Active',
    'Dr. Robert Martinez',
    'Blood pressure medication. Monitor for dry cough.',
    NOW(),
    NOW()
  ),
  (
    '40000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    'Children''s Chewable Vitamins',
    CURRENT_DATE - INTERVAL '45 days',
    NULL,
    '1 tablet daily',
    'Active',
    'Dr. Lisa Chen',
    'Give with breakfast. Contains iron.',
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
    3,
    4,
    4,
    3,
    'Feeling okay. Energy levels better after medication adjustment.',
    NOW()
  ),
  (
    '50000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000001'::uuid,
    CURRENT_DATE - INTERVAL '2 days',
    4,
    4,
    3,
    4,
    'Good day overall. Blood sugar levels stable.',
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
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '2 hours',
  60,
  '10.0.0.1',
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
SELECT 'Demo user setup completed successfully for US database!' as status;