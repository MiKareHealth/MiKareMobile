/*
  # Create demo user

  1. Changes
    - Create a demo user account with email/password
    - Insert profile data for the demo user
*/

-- Create demo user with email/password
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Only create if demo user doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'demo@example.com'
  ) THEN
    -- Insert demo user into auth.users
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
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'demo@example.com',
      crypt('demo123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Demo User"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO demo_user_id;

    -- Profile will be created automatically via trigger
  END IF;
END $$;