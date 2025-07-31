-- Drop existing schema if it exists
DROP SCHEMA IF EXISTS auth CASCADE;

-- Create auth schema
CREATE SCHEMA auth;

-- Set postgres as the owner
ALTER SCHEMA auth OWNER TO postgres;

-- Grant all privileges on schema to postgres
GRANT ALL PRIVILEGES ON SCHEMA auth TO postgres;

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA auth TO authenticated, anon;

-- Create required extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt;

-- Create auth tables
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL PRIMARY KEY,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone character varying(255),
    phone_confirmed_at timestamp with time zone,
    phone_change character varying(255),
    phone_change_token character varying(255),
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255),
    banned_until timestamp with time zone,
    reauthentication_token character varying(255),
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false,
    deleted_at timestamp with time zone
);

-- Grant permissions on auth.users
GRANT ALL ON auth.users TO authenticated, anon;
GRANT ALL ON auth.users TO service_role;

-- Create auth functions
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $func$
SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
$func$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $func$
SELECT current_setting('request.jwt.claims', true)::json->>'role';
$func$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.role() TO authenticated, anon;

-- Create auth trigger function
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, timezone, time_format, subscription_plan, subscription_status, preferred_session_length, onboard_complete, show_splash)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
        'UTC',
        '12h',
        'MiKare Health - free plan',
        'inactive',
        30,
        false,
        true
    );
    RETURN NEW;
END;
$func$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Grant permissions on trigger function
GRANT EXECUTE ON FUNCTION auth.handle_new_user() TO authenticated, anon;

RAISE NOTICE 'Auth schema setup completed successfully'; 