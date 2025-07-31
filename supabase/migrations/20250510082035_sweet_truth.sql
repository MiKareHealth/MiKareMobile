/*
  # Fix session tracking triggers and policies

  1. Changes
    - Fix functions and triggers for user login/logout tracking
    - Add existence checks for policies to prevent duplication errors
    
  2. Security
    - Maintains RLS policies for user_sessions table
    - Uses existence checks to avoid policy conflicts
*/

-- Create a function to handle user login events
CREATE OR REPLACE FUNCTION handle_new_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new session record when a user logs in
  INSERT INTO user_sessions (
    user_id,
    login_time,
    is_active
  ) VALUES (
    NEW.id,
    now(),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to handle user logout events
CREATE OR REPLACE FUNCTION handle_logout()
RETURNS TRIGGER AS $$
BEGIN
  -- Update active sessions for the user when they log out
  UPDATE user_sessions
  SET 
    logout_time = now(),
    is_active = false
  WHERE 
    user_id = OLD.id 
    AND is_active = true
    AND logout_time IS NULL;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to handle user login events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_login'
  ) THEN
    CREATE TRIGGER on_auth_user_login
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_login();
  END IF;
END $$;

-- Create a trigger to handle user logout events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_logout'
  ) THEN
    CREATE TRIGGER on_auth_user_logout
    BEFORE DELETE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_logout();
  END IF;
END $$;

-- Add RLS policies for user_sessions table with existence checks
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Check if the policy exists before attempting to create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can view their own sessions'
  ) THEN
    -- Users can view their own sessions
    CREATE POLICY "Users can view their own sessions"
    ON user_sessions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can create their own sessions'
  ) THEN
    -- Users can create their own sessions
    CREATE POLICY "Users can create their own sessions"
    ON user_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_sessions' AND policyname = 'Users can update their own sessions'
  ) THEN
    -- Users can update their own sessions
    CREATE POLICY "Users can update their own sessions"
    ON user_sessions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);
  END IF;
END $$;