-- Initial setup script for new Supabase project
-- This script assumes Supabase's built-in auth schema is already set up

-- Create required extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pgjwt";

-- Create public.profiles table
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
    last_login timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS public.user_sessions (
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

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    full_name text NOT NULL,
    dob date NOT NULL,
    gender text NOT NULL,
    relationship text NOT NULL,
    country text NOT NULL,
    address text NOT NULL,
    phone_number text NOT NULL,
    photo_url text,
    notes text,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create patient_activities table
CREATE TABLE IF NOT EXISTS public.patient_activities (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    activity_type text NOT NULL,
    activity_date timestamptz NOT NULL,
    follow_up_date timestamptz,
    notes text,
    structured_outcome jsonb,
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create patient_documents table
CREATE TABLE IF NOT EXISTS public.patient_documents (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
    activity_id uuid REFERENCES patient_activities(id) ON DELETE SET NULL,
    file_name text NOT NULL,
    file_type text NOT NULL,
    file_size bigint NOT NULL,
    file_url text NOT NULL,
    description text,
    uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
    uploaded_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create RLS policies for user_sessions
CREATE POLICY "Users can view their own sessions"
    ON public.user_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions"
    ON public.user_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.user_sessions FOR UPDATE
    USING (auth.uid() = user_id);

-- Create RLS policies for patients
CREATE POLICY "Users can view their own patients"
    ON public.patients FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own patients"
    ON public.patients FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients"
    ON public.patients FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients"
    ON public.patients FOR DELETE
    USING (auth.uid() = user_id);

-- Create RLS policies for patient_activities
CREATE POLICY "Users can view their patients' activities"
    ON public.patient_activities FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_activities.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create activities for their patients"
    ON public.patient_activities FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_activities.patient_id
            AND patients.user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

CREATE POLICY "Users can update their patients' activities"
    ON public.patient_activities FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_activities.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their patients' activities"
    ON public.patient_activities FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_activities.patient_id
            AND patients.user_id = auth.uid()
        )
    );

-- Create RLS policies for patient_documents
CREATE POLICY "Users can view their patients' documents"
    ON public.patient_documents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_documents.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create documents for their patients"
    ON public.patient_documents FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_documents.patient_id
            AND patients.user_id = auth.uid()
        )
        AND uploaded_by = auth.uid()
    );

CREATE POLICY "Users can update their patients' documents"
    ON public.patient_documents FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_documents.patient_id
            AND patients.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their patients' documents"
    ON public.patient_documents FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.patients
            WHERE patients.id = patient_documents.patient_id
            AND patients.user_id = auth.uid()
        )
    );

-- Create trigger function for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
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

-- Create trigger for new user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user login
CREATE OR REPLACE FUNCTION public.handle_user_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Insert new session record
    INSERT INTO public.user_sessions (
        user_id,
        login_time,
        is_active
    ) VALUES (
        NEW.user_id,
        now(),
        true
    );

    -- Update last_login in profiles
    UPDATE public.profiles
    SET last_login = now()
    WHERE id = NEW.user_id;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't block login
    RAISE NOTICE 'Error in handle_user_login: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create function to handle user logout
CREATE OR REPLACE FUNCTION public.handle_logout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the session when user logs out
    UPDATE public.user_sessions
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
$$;

-- Create login trigger
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;
CREATE TRIGGER on_auth_login
    AFTER INSERT ON auth.sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_login();

-- Create logout trigger
DROP TRIGGER IF EXISTS on_auth_logout ON auth.sessions;
CREATE TRIGGER on_auth_logout
    AFTER DELETE ON auth.sessions
    FOR EACH ROW EXECUTE FUNCTION public.handle_logout();

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, anon;

-- Create demo user
DO $$
DECLARE
    demo_user_id uuid;
BEGIN
    -- Create demo user
    INSERT INTO auth.users (
        id,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_user_meta_data,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'demo@mikare.app',
        crypt('demo123', gen_salt('bf')),
        now(),
        jsonb_build_object(
            'username', 'demo_user',
            'full_name', 'Demo User'
        ),
        now(),
        now()
    )
    ON CONFLICT (email) DO NOTHING
    RETURNING id INTO demo_user_id;

    -- Update profile for demo user
    IF demo_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
            username = 'demo_user',
            full_name = 'Demo User',
            onboard_complete = true,
            show_splash = false
        WHERE id = demo_user_id;
    END IF;
END
$$; 