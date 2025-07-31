/*
  # Add user sessions tracking and timeout preferences
  
  1. New Tables
     - `user_sessions`: Tracks user login/logout times and session length preferences
        - `id` (uuid, primary key)
        - `user_id` (uuid, foreign key to auth.users)
        - `login_time` (timestamp with timezone)
        - `logout_time` (timestamp with timezone, nullable)
        - `session_length_minutes` (integer)
        - `ip_address` (text, nullable)
        - `user_agent` (text, nullable)
        - `is_active` (boolean, default: true)
        - `created_at` (timestamp with timezone)

  2. Modified Tables
     - `profiles`: Add preferred session timeout field
        - `preferred_session_length` (integer, default: 30)

  3. Security
     - Enable RLS on user_sessions table
     - Create policies for users to access only their own session data
*/

-- Add preferred_session_length to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS preferred_session_length integer DEFAULT 30;

-- Create user_sessions table
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

-- Enable Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
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

-- Create function to record login sessions
CREATE OR REPLACE FUNCTION public.handle_new_login()
RETURNS trigger AS $$
DECLARE
  preferred_length integer;
BEGIN
  -- Get user's preferred session length
  SELECT COALESCE(p.preferred_session_length, 30)
  INTO preferred_length
  FROM profiles p
  WHERE p.id = auth.uid();

  -- Insert new session record
  INSERT INTO user_sessions (
    user_id,
    session_length_minutes
  ) VALUES (
    auth.uid(),
    preferred_length
  );

  -- Update last_login in profiles
  UPDATE profiles
  SET last_login = now()
  WHERE id = auth.uid();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new login
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;
CREATE TRIGGER on_auth_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_login();

-- Create function to handle logout
CREATE OR REPLACE FUNCTION public.handle_logout()
RETURNS trigger AS $$
BEGIN
  -- Update the most recent active session for this user
  UPDATE user_sessions
  SET logout_time = now(),
      is_active = false
  WHERE user_id = OLD.user_id
    AND is_active = true
    AND logout_time IS NULL;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for logout
DROP TRIGGER IF EXISTS on_auth_logout ON auth.sessions;
CREATE TRIGGER on_auth_logout
  AFTER DELETE ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_logout();