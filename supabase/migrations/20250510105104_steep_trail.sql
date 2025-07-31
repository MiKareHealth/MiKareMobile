/*
  # Auth logging and session fixes

  This migration fixes issues with auth logging and session tracking
  by modifying triggers to use a more reliable approach.
*/

-- Drop problematic triggers if they exist
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;
DROP TRIGGER IF EXISTS on_auth_logout ON auth.sessions;
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_logout ON auth.users;

-- Create or replace session functions with better error handling
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS trigger AS $$
BEGIN
  -- Attempt to create session record, but don't fail if this fails
  BEGIN
    INSERT INTO user_sessions (
      user_id,
      login_time,
      is_active
    ) VALUES (
      NEW.user_id,
      now(),
      true
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't abort the transaction
    RAISE NOTICE 'Failed to create session record: %', SQLERRM;
  END;
  
  -- Attempt to update last login timestamp, but don't fail if this fails
  BEGIN
    UPDATE profiles
    SET last_login = now()
    WHERE id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't abort the transaction
    RAISE NOTICE 'Failed to update last login: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a safe logout handler that won't block auth operations
CREATE OR REPLACE FUNCTION handle_logout()
RETURNS trigger AS $$
BEGIN
  -- Attempt to update logout time, but don't fail if this fails
  BEGIN
    -- Update active sessions for this user
    UPDATE user_sessions
    SET 
      logout_time = now(),
      is_active = false
    WHERE 
      user_id = OLD.user_id
      AND is_active = true
      AND logout_time IS NULL;
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't abort the transaction
    RAISE NOTICE 'Failed to update session on logout: %', SQLERRM;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new auth triggers with better error handling
CREATE TRIGGER on_auth_login
AFTER INSERT ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION handle_user_login();

CREATE TRIGGER on_auth_logout
AFTER DELETE ON auth.sessions
FOR EACH ROW
EXECUTE FUNCTION handle_logout();

-- Make sure the user_sessions table has RLS enabled
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Make sure proper RLS policies exist
DO $$
BEGIN
  -- Drop and recreate policies to ensure they're correct
  DROP POLICY IF EXISTS "Users can view their own sessions" ON user_sessions;
  DROP POLICY IF EXISTS "Users can create their own sessions" ON user_sessions;
  DROP POLICY IF EXISTS "Users can update their own sessions" ON user_sessions;
  
  -- Create properly scoped policies
  CREATE POLICY "Users can view their own sessions"
    ON user_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  
  CREATE POLICY "Users can create their own sessions"
    ON user_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  
  CREATE POLICY "Users can update their own sessions"
    ON user_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
END $$;