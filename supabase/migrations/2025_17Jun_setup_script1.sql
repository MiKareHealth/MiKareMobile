-- Create Enum Types
CREATE TYPE patient_gender AS ENUM ('Male', 'Female', 'Other');
CREATE TYPE medication_status AS ENUM ('Active', 'Inactive');
CREATE TYPE symptom_severity AS ENUM ('Mild', 'Moderate', 'Severe');
CREATE TYPE diary_entry_type AS ENUM ('Appointment', 'Diagnosis', 'Note', 'Treatment', 'Other', 'AI');

-- Create Trigger Function for updated_at columns
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, NOW()) NOT NULL,
  address TEXT,
  phone_number TEXT,
  timezone TEXT DEFAULT 'UTC',
  time_format TEXT DEFAULT '12h',
  plan_type TEXT DEFAULT 'Free',
  last_login TIMESTAMP WITH TIME ZONE,
  preferred_session_length INTEGER DEFAULT 30,
  onboard_complete BOOLEAN DEFAULT FALSE,
  show_splash BOOLEAN DEFAULT TRUE
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (TRUE);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create patients table
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  full_name TEXT NOT NULL,
  dob DATE NOT NULL,
  gender patient_gender NOT NULL,
  relationship TEXT NOT NULL,
  country TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  photo_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on patients
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Policies for patients
CREATE POLICY "Users can view their own patients"
  ON patients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients"
  ON patients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for patients updated_at
CREATE TRIGGER handle_patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create patient_activities table
CREATE TABLE IF NOT EXISTS public.patient_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_date TIMESTAMPTZ NOT NULL,
  follow_up_date TIMESTAMPTZ,
  notes TEXT,
  structured_outcome JSONB,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on patient_activities
ALTER TABLE public.patient_activities ENABLE ROW LEVEL SECURITY;

-- Policies for patient_activities
CREATE POLICY "Users can view activities for their patients"
  ON patient_activities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_activities.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create activities for their patients"
  ON patient_activities FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_activities.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update activities for their patients"
  ON patient_activities FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_activities.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete activities for their patients"
  ON patient_activities FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_activities.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Trigger for patient_activities updated_at
CREATE TRIGGER handle_patient_activities_updated_at
  BEFORE UPDATE ON patient_activities
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create symptoms table
CREATE TABLE IF NOT EXISTS public.symptoms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  severity symptom_severity NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on symptoms
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;

-- Policies for symptoms
CREATE POLICY "Users can view symptoms for their patients"
  ON symptoms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create symptoms for their patients"
  ON symptoms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update symptoms for their patients"
  ON symptoms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete symptoms for their patients"
  ON symptoms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Trigger for symptoms updated_at
CREATE TRIGGER handle_symptoms_updated_at
  BEFORE UPDATE ON symptoms
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  entry_type diary_entry_type NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  severity TEXT,
  attendees TEXT[] DEFAULT ARRAY[]::TEXT[],
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  ai_type TEXT,
  source_entries TEXT[]
);

-- Enable RLS on diary_entries
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

-- Policies for diary_entries
CREATE POLICY "Users can view diary entries for their patients"
  ON diary_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create diary entries for their patients"
  ON diary_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update diary entries for their patients"
  ON diary_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete diary entries for their patients"
  ON diary_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Trigger for diary_entries updated_at
CREATE TRIGGER handle_diary_entries_updated_at
  BEFORE UPDATE ON diary_entries
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create patient_documents table
CREATE TABLE IF NOT EXISTS public.patient_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  activity_id UUID REFERENCES public.patient_activities(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  diary_entry_id UUID REFERENCES public.diary_entries(id) ON DELETE SET NULL
);

-- Enable RLS on patient_documents
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;

-- Policies for patient_documents
CREATE POLICY "Users can view documents for their patients"
  ON patient_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_documents.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload documents for their patients"
  ON patient_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_documents.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update documents for their patients"
  ON patient_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_documents.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete documents for their patients"
  ON patient_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = patient_documents.patient_id
      AND patients.user_id = auth.uid()
    )
  );

-- Create medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  medication_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  dosage TEXT NOT NULL,
  status medication_status NOT NULL,
  prescribed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS on medications
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- Policies for medications
CREATE POLICY "Users can view medications for their patients"
  ON medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create medications for their patients"
  ON medications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update medications for their patients"
  ON medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete medications for their patients"
  ON medications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Trigger for medications updated_at
CREATE TRIGGER handle_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  logout_time TIMESTAMPTZ,
  session_length_minutes INTEGER DEFAULT 30 NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable RLS for user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for user_sessions
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

-- Create mood_entries table
CREATE TABLE IF NOT EXISTS mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  body INTEGER NOT NULL CHECK (body BETWEEN 1 AND 5),
  mind INTEGER NOT NULL CHECK (mind BETWEEN 1 AND 5),
  sleep INTEGER NOT NULL CHECK (sleep BETWEEN 1 AND 5),
  mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, date)
);

-- Enable RLS for mood_entries
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Policies for mood_entries
CREATE POLICY "Users can view mood entries for their patients"
  ON mood_entries
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create mood entries for their patients"
  ON mood_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update mood entries for their patients"
  ON mood_entries
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete mood entries for their patients"
  ON mood_entries
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients
    WHERE patients.id = mood_entries.profile_id
    AND patients.user_id = auth.uid()
  ));

-- Create or replace the user login function (for user_sessions table)
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  DECLARE
    preferred_length INTEGER;
  BEGIN
    SELECT COALESCE(p.preferred_session_length, 30)
    INTO preferred_length
    FROM profiles p
    WHERE p.id = NEW.user_id;
  EXCEPTION WHEN OTHERS THEN
    preferred_length := 30;
  END;

  INSERT INTO user_sessions (
    user_id,
    login_time,
    session_length_minutes,
    is_active
  ) VALUES (
    NEW.user_id,
    NOW(),
    preferred_length,
    TRUE
  );

  UPDATE profiles
  SET last_login = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in handle_user_login: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the user logout function (for user_sessions table)
CREATE OR REPLACE FUNCTION handle_logout()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_sessions
  SET
    logout_time = NOW(),
    is_active = FALSE
  WHERE
    user_id = OLD.user_id
    AND is_active = TRUE;

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in handle_logout: %', SQLERRM;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing auth.sessions triggers to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_login ON auth.sessions;
DROP TRIGGER IF EXISTS on_auth_logout ON auth.sessions;

-- Create login trigger on auth.sessions
CREATE TRIGGER on_auth_login
  AFTER INSERT ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_login();

-- Create logout trigger on auth.sessions
CREATE TRIGGER on_auth_logout
  AFTER DELETE ON auth.sessions
  FOR EACH ROW
  EXECUTE FUNCTION handle_logout();

-- Create demo user and update their profile
DO $$
DECLARE
  demo_user_id UUID;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'demo@example.com'
  ) THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      recovery_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'demo@example.com', crypt('demo123', gen_salt('bf')), NOW(), NOW(), NOW(),
      '{"provider":"email","providers":["email"]}', '{"full_name":"Demo User"}',
      NOW(), NOW(), '', '', '', ''
    )
    RETURNING id INTO demo_user_id;
  ELSE
    SELECT id INTO demo_user_id FROM auth.users WHERE email = 'demo@example.com';
  END IF;

  IF demo_user_id IS NOT NULL THEN
    UPDATE profiles
    SET
      onboard_complete = TRUE,
      show_splash = FALSE
    WHERE id = demo_user_id;
  END IF;
END $$;
