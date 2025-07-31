-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA auth TO authenticated, anon;

-- Grant create and usage permissions to postgres role
GRANT CREATE, USAGE ON SCHEMA auth TO postgres;

-- Grant all privileges on schema to postgres role
ALTER SCHEMA auth OWNER TO postgres;

-- Grant all privileges on all tables in schema to postgres role
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO postgres;

-- Grant all privileges on all sequences in schema to postgres role
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO postgres;

-- Grant all privileges on all functions in schema to postgres role
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA auth TO postgres; 