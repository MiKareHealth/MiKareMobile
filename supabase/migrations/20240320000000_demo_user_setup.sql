-- Demo User Setup Script (Run this in each region's database)
DO $$
DECLARE
    demo_user_id uuid;
BEGIN
    -- Create or update the demo user in auth.users
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
        '00000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'demo@example.com',
        crypt('demo123', gen_salt('bf')), -- This will generate a proper bcrypt hash
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
    ON CONFLICT (id) DO UPDATE SET
        encrypted_password = EXCLUDED.encrypted_password,
        email_confirmed_at = NOW(),
        updated_at = NOW()
    RETURNING id INTO demo_user_id;

    -- Create or update the demo user profile
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