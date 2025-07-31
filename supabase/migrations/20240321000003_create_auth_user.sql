-- Create auth_user role if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'auth_user') THEN
        CREATE ROLE auth_user WITH LOGIN PASSWORD 'auth_user_password' SUPERUSER;
    END IF;
END
$$;

-- Grant all privileges on database to auth_user
GRANT ALL PRIVILEGES ON DATABASE postgres TO auth_user;

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant ownership of auth schema to auth_user
ALTER SCHEMA auth OWNER TO auth_user;

-- Grant all privileges on auth schema to auth_user
GRANT ALL PRIVILEGES ON SCHEMA auth TO auth_user;

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA auth TO authenticated, anon;

-- Create required extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pgjwt; 