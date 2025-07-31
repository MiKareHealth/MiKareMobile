-- Check current setup and provide instructions
DO $$
DECLARE
    is_superuser boolean;
    auth_schema_exists boolean;
    pgcrypto_exists boolean;
    pgjwt_exists boolean;
BEGIN
    -- Check if we have superuser privileges
    SELECT usesuper INTO is_superuser FROM pg_user WHERE usename = current_user;
    
    -- Check if auth schema exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'
    ) INTO auth_schema_exists;
    
    -- Check if extensions exist
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
    ) INTO pgcrypto_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'pgjwt'
    ) INTO pgjwt_exists;
    
    -- Raise notices with current status and instructions
    RAISE NOTICE 'Current Setup Status:';
    RAISE NOTICE '-------------------';
    RAISE NOTICE 'Superuser privileges: %', CASE WHEN is_superuser THEN 'Yes' ELSE 'No' END;
    RAISE NOTICE 'Auth schema exists: %', CASE WHEN auth_schema_exists THEN 'Yes' ELSE 'No' END;
    RAISE NOTICE 'pgcrypto extension: %', CASE WHEN pgcrypto_exists THEN 'Yes' ELSE 'No' END;
    RAISE NOTICE 'pgjwt extension: %', CASE WHEN pgjwt_exists THEN 'Yes' ELSE 'No' END;
    
    -- Provide instructions if not everything is set up
    IF NOT is_superuser THEN
        RAISE NOTICE E'\nIMPORTANT: This migration requires superuser privileges.';
        RAISE NOTICE 'Please run the following commands as a superuser:';
        RAISE NOTICE E'\n1. Connect to your database as superuser:';
        RAISE NOTICE '   psql -U postgres -d your_database_name';
        RAISE NOTICE E'\n2. Run the following commands:';
        RAISE NOTICE '   CREATE EXTENSION IF NOT EXISTS "pgcrypto";';
        RAISE NOTICE '   CREATE EXTENSION IF NOT EXISTS "pgjwt";';
        RAISE NOTICE '   CREATE SCHEMA IF NOT EXISTS auth;';
        RAISE NOTICE E'\n3. Then run the auth schema setup script:';
        RAISE NOTICE '   \i supabase/migrations/20240321000002_setup_auth_schema.sql';
        RAISE NOTICE E'\n4. Finally, run the demo user setup:';
        RAISE NOTICE '   \i supabase/migrations/20240321000001_fix_demo_user_schema_v2.sql';
    END IF;
END $$; 