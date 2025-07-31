-- Ensure consistent schema for demo user setup
DO $$
BEGIN
    -- Add missing columns to profiles if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'preferred_session_length'
    ) THEN
        ALTER TABLE profiles ADD COLUMN preferred_session_length integer DEFAULT 30;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'last_login'
    ) THEN
        ALTER TABLE profiles ADD COLUMN last_login timestamptz;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'onboard_complete'
    ) THEN
        ALTER TABLE profiles ADD COLUMN onboard_complete boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'show_splash'
    ) THEN
        ALTER TABLE profiles ADD COLUMN show_splash boolean DEFAULT true;
    END IF;
END $$;

-- Create or update demo user with consistent ID
DO $$
DECLARE
    demo_user_id uuid := '00000000-0000-0000-0000-000000000001';
    existing_user_id uuid;
BEGIN
    -- First, check if demo user exists by email
    SELECT id INTO existing_user_id
    FROM auth.users
    WHERE email = 'demo@example.com';

    -- If user exists, update it
    IF existing_user_id IS NOT NULL THEN
        UPDATE auth.users
        SET
            encrypted_password = crypt('demo123', gen_salt('bf')),
            email_confirmed_at = NOW(),
            updated_at = NOW(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}',
            raw_user_meta_data = '{"full_name":"Demo User"}'
        WHERE id = existing_user_id;

        demo_user_id := existing_user_id;
    ELSE
        -- If user doesn't exist, create it
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
            demo_user_id,
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
        );
    END IF;

    -- Create or update demo user profile
    INSERT INTO public.profiles (
        id,
        username,
        full_name,
        timezone,
        time_format,
        plan_type,
        preferred_session_length,
        onboard_complete,
        show_splash
    )
    VALUES (
        demo_user_id,
        'demo_user',
        'Demo User',
        'UTC',
        '12h',
        'Free',
        30,
        true,
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        full_name = EXCLUDED.full_name,
        timezone = EXCLUDED.timezone,
        time_format = EXCLUDED.time_format,
        plan_type = EXCLUDED.plan_type,
        preferred_session_length = EXCLUDED.preferred_session_length,
        onboard_complete = EXCLUDED.onboard_complete,
        show_splash = EXCLUDED.show_splash;

    -- Create a session for the demo user
    INSERT INTO auth.sessions (
        id,
        user_id,
        created_at,
        updated_at,
        factor_id,
        aal,
        not_after
    )
    VALUES (
        gen_random_uuid(),
        demo_user_id,
        NOW(),
        NOW(),
        NULL,
        'aal1',
        NOW() + INTERVAL '30 days'
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW(),
        not_after = NOW() + INTERVAL '30 days';
END $$; 