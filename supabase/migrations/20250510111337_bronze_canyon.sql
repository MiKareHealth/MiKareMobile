-- Add preferred_session_length field to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'preferred_session_length'
  ) THEN
    ALTER TABLE profiles ADD COLUMN preferred_session_length integer DEFAULT 30;
  END IF;
END $$;

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time timestamptz DEFAULT now() NOT NULL,
  logout_time timestamptz,
  session_length_minutes integer DEFAULT 30 NOT NULL,
  ip_address text,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DO $$
BEGIN
  -- Drop existing policies to avoid conflicts
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

-- Create or replace the user login function
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS trigger AS $$
BEGIN
  -- Get user's preferred session length with error handling
  DECLARE
    preferred_length integer;
  BEGIN
    SELECT COALESCE(p.preferred_session_length, 30)
    INTO preferred_length
    FROM profiles p
    WHERE p.id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    preferred_length := 30; -- Default if error
  END;
  
  -- Insert new session record
  INSERT INTO user_sessions (
    user_id,
    login_time,
    session_length_minutes,
    is_active
  ) VALUES (
    NEW.user_id,
    now(),
    preferred_length,
    true
  );
  
  -- Update last_login in profiles
  UPDATE profiles
  SET last_login = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block login
  RAISE NOTICE 'Error in handle_user_login: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the user logout function
CREATE OR REPLACE FUNCTION handle_logout()
RETURNS trigger AS $$
BEGIN
  -- Update the session when user logs out
  UPDATE user_sessions
  SET 
    logout_time = now(),
    is_active = false
  WHERE 
    user_id = OLD.user_id 
    AND is_active = true;
  
  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't block logout
  RAISE NOTICE 'Error in handle_logout: %', SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;
DROP TRIGGER IF EXISTS on_auth_logout ON auth.sessions;

-- Create login trigger
CREATE TRIGGER on_auth_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_login();

-- Create logout trigger
CREATE TRIGGER on_auth_logout
  AFTER DELETE ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_logout();