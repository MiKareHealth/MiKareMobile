-- Reset database to a known state
-- This script should be run using the service_role key

-- Create required extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create auth.users table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    encrypted_password text,
    email_confirmed_at timestamptz,
    invited_at timestamptz,
    confirmation_token text,
    confirmation_sent_at timestamptz,
    recovery_token text,
    recovery_sent_at timestamptz,
    email_change_token text,
    email_change text,
    email_change_sent_at timestamptz,
    last_sign_in_at timestamptz,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamptz,
    updated_at timestamptz,
    phone text,
    phone_confirmed_at timestamptz,
    phone_change text,
    phone_change_token text,
    phone_change_sent_at timestamptz,
    confirmed_at timestamptz,
    email_change_confirm_status smallint,
    banned_until timestamptz,
    reauthentication_token text,
    reauthentication_sent_at timestamptz
);

-- Create auth.identities table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.identities (
    id text PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    identity_data jsonb,
    provider text,
    last_sign_in_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz
);

-- Create auth.instances table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid PRIMARY KEY,
    uuid uuid,
    raw_base_config text,
    created_at timestamptz,
    updated_at timestamptz
);

-- Create auth.sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz,
    updated_at timestamptz,
    factor_id uuid,
    aal aal_level,
    not_after timestamptz
);

-- Create auth.refresh_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    id bigint PRIMARY KEY,
    token text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    revoked boolean,
    created_at timestamptz,
    updated_at timestamptz,
    parent text,
    session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE
);

-- Create auth.mfa_factors table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    friendly_name text,
    factor_type factor_type,
    status factor_status,
    created_at timestamptz,
    updated_at timestamptz,
    secret text
);

-- Create auth.mfa_challenges table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid PRIMARY KEY,
    factor_id uuid REFERENCES auth.mfa_factors(id) ON DELETE CASCADE,
    created_at timestamptz,
    verified_at timestamptz,
    ip_address inet
);

-- Create auth.flow_state table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    auth_code text,
    code_challenge_method text,
    code_challenge text,
    provider_type text,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamptz,
    updated_at timestamptz,
    authentication_method authentication_method
);

-- Create auth.sso_providers table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.sso_providers (
    id uuid PRIMARY KEY,
    resource_id text,
    created_at timestamptz,
    updated_at timestamptz
);

-- Create auth.sso_domains table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.sso_domains (
    id uuid PRIMARY KEY,
    sso_provider_id uuid REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    domain text,
    created_at timestamptz,
    updated_at timestamptz
);

-- Create auth.saml_providers table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.saml_providers (
    id uuid PRIMARY KEY,
    sso_provider_id uuid REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    entity_id text,
    metadata_xml text,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamptz,
    updated_at timestamptz
);

-- Create auth.saml_relay_states table if it doesn't exist
CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
    id uuid PRIMARY KEY,
    sso_provider_id uuid REFERENCES auth.sso_providers(id) ON DELETE CASCADE,
    flow_state_id uuid REFERENCES auth.flow_state(id) ON DELETE CASCADE,
    request_id text,
    for_email text,
    redirect_to text,
    from_ip_address inet,
    created_at timestamptz,
    updated_at timestamptz,
    flow_state_created_at timestamptz
);

-- Create public.profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username text UNIQUE,
    full_name text,
    timezone text DEFAULT 'UTC',
    time_format text DEFAULT '12h',
    plan_type text DEFAULT 'Free',
    preferred_session_length integer DEFAULT 30,
    onboard_complete boolean DEFAULT false,
    show_splash boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create or replace auth functions
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
        SELECT
            CASE
                WHEN current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
                    THEN (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid
                ELSE (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
            END
    $$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
        SELECT current_setting('request.jwt.claims', true)::json->>'role'
    $$;

-- Create or replace auth trigger function
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create or replace trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO authenticated, anon;
GRANT USAGE ON SCHEMA public TO authenticated, anon;

GRANT ALL ON ALL TABLES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA auth TO postgres;

GRANT SELECT ON ALL TABLES IN SCHEMA auth TO authenticated, anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA auth TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO authenticated, anon;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon; 