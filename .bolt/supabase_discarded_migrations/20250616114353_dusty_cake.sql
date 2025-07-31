/*
  # Step 1: Create Temporary User to Get Correct Password Hash
  
  This script creates a temporary user with 'demo123' password to extract
  the correct bcrypt hash that can be used for the demo user.
  
  Run this first, then follow the manual steps to copy the password hash.
*/

-- Create a temporary user to get the correct password hash for 'demo123'
-- This will be created through Supabase Auth, so we'll insert the user manually
-- with a known structure, then update via the auth API

-- Note: This approach creates a user that will need to be managed through
-- Supabase's auth system. After running this, you'll need to:
-- 1. Go to Authentication > Users in Supabase dashboard
-- 2. Find the temp-hash-user@example.com user
-- 3. Copy the encrypted_password value from the auth.users table
-- 4. Run step 2 script with that hash
-- 5. Run step 3 script to clean up

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
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'temp-hash-user@example.com',
  '$2a$10$placeholder.hash.for.temp.user.will.be.replaced.by.supabase',
  now(),
  null,
  null,
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- The above will create a user, but to get the correct hash, you need to:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Invite new user" or use the signup process
-- 3. Create user: temp-hash-user@example.com with password: demo123
-- 4. Go to Database > Table Editor > auth.users table
-- 5. Find temp-hash-user@example.com and copy the encrypted_password value
-- 6. Use that value in the next script

SELECT 'Temporary user setup - now create the user through Supabase Auth interface' as message;