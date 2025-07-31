/*
  # Complete MiKare Database Setup Script
  
  This script creates the complete database schema for MiKare including:
  1. Custom Types (Enums)
  2. Tables with all columns and constraints
  3. Row Level Security (RLS) policies
  4. Triggers and trigger functions
  5. Indexes
  6. Foreign key relationships
  
  Run this script on your new UK and USA Supabase instances to replicate 
  the exact same structure as your AU database.
*/

-- =============================================================================
-- 1. CUSTOM TYPES (ENUMS)
-- =============================================================================

CREATE TYPE patient_gender AS ENUM ('Female', 'Male', 'Other');
CREATE TYPE medication_status AS ENUM ('Active', 'Inactive');
CREATE TYPE symptom_severity AS ENUM ('Mild', 'Moderate', 'Severe');
CREATE TYPE diary_entry_type AS ENUM ('AI', 'Appointment', 'Diagnosis', 'Note', 'Other', 'Symptom', 'Treatment');

-- =============================================================================
-- 2. TRIGGER FUNCTIONS
-- =============================================================================

-- Function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle user login tracking
CREATE OR REPLACE FUNCTION handle_user_login()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be customized for login tracking
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new login sessions
CREATE OR REPLACE FUNCTION handle_new_login()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be customized for new login tracking
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle logout tracking
CREATE OR REPLACE FUNCTION handle_logout()
RETURNS TRIGGER AS $$
BEGIN
  -- This function can be customized for logout tracking
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for new users
  INSERT INTO public.profiles (id, username, full_name, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. TABLES
-- =============================================================================

-- Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text UNIQUE,
  full_name text,
  avatar_url text,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  address text,
  phone_number text,
  timezone text DEFAULT 'UTC'::text,
  time_format text DEFAULT '12h'::text,
  plan_type text DEFAULT 'Free'::text,
  last_login timestamptz,
  preferred_session_length integer DEFAULT 30,
  onboard_complete boolean DEFAULT false,
  show_splash boolean DEFAULT true
);

-- Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  full_name text NOT NULL,
  dob date NOT NULL,
  gender patient_gender NOT NULL,
  relationship text NOT NULL,
  country text NOT NULL,
  address text NOT NULL,
  phone_number text NOT NULL,
  photo_url text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Diary Entries Table
CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  entry_type diary_entry_type NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  notes text,
  severity text,
  attendees text[] DEFAULT ARRAY[]::text[],
  file_url text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  ai_type text,
  source_entries text[]
);

-- Symptoms Table
CREATE TABLE IF NOT EXISTS symptoms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  severity symptom_severity NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Medications Table
CREATE TABLE IF NOT EXISTS medications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  medication_name text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  dosage text NOT NULL,
  status medication_status NOT NULL,
  prescribed_by text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Mood Entries Table
CREATE TABLE IF NOT EXISTS mood_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  body integer NOT NULL CHECK (body >= 1 AND body <= 5),
  mind integer NOT NULL CHECK (mind >= 1 AND mind <= 5),
  sleep integer NOT NULL CHECK (sleep >= 1 AND sleep <= 5),
  mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(profile_id, date)
);

-- User Sessions Table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  login_time timestamptz DEFAULT now() NOT NULL,
  logout_time timestamptz,
  session_length_minutes integer DEFAULT 30 NOT NULL,
  ip_address text,
  user_agent text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Patient Activities Table
CREATE TABLE IF NOT EXISTS patient_activities (
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

-- Patient Documents Table
CREATE TABLE IF NOT EXISTS patient_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  activity_id uuid REFERENCES patient_activities(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  file_url text NOT NULL,
  description text,
  uploaded_by uuid REFERENCES auth.users(id) NOT NULL,
  uploaded_at timestamptz DEFAULT now() NOT NULL,
  diary_entry_id uuid REFERENCES diary_entries(id) ON DELETE SET NULL
);

-- =============================================================================
-- 4. INDEXES
-- =============================================================================

-- Profiles indexes
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pkey ON profiles(id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_key ON profiles(username);

-- Patients indexes
CREATE UNIQUE INDEX IF NOT EXISTS patients_pkey ON patients(id);

-- Diary entries indexes
CREATE UNIQUE INDEX IF NOT EXISTS diary_entries_pkey ON diary_entries(id);

-- Symptoms indexes
CREATE UNIQUE INDEX IF NOT EXISTS symptoms_pkey ON symptoms(id);

-- Medications indexes
CREATE UNIQUE INDEX IF NOT EXISTS medications_pkey ON medications(id);

-- Mood entries indexes
CREATE UNIQUE INDEX IF NOT EXISTS mood_entries_pkey ON mood_entries(id);
CREATE UNIQUE INDEX IF NOT EXISTS mood_entries_profile_id_date_key ON mood_entries(profile_id, date);

-- User sessions indexes
CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_pkey ON user_sessions(id);

-- Patient activities indexes
CREATE UNIQUE INDEX IF NOT EXISTS patient_activities_pkey ON patient_activities(id);

-- Patient documents indexes
CREATE UNIQUE INDEX IF NOT EXISTS patient_documents_pkey ON patient_documents(id);

-- =============================================================================
-- 5. TRIGGERS
-- =============================================================================

-- Updated at triggers
CREATE TRIGGER handle_patients_updated_at 
  BEFORE UPDATE ON patients 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_diary_entries_updated_at 
  BEFORE UPDATE ON diary_entries 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_symptoms_updated_at 
  BEFORE UPDATE ON symptoms 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_medications_updated_at 
  BEFORE UPDATE ON medications 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_patient_activities_updated_at 
  BEFORE UPDATE ON patient_activities 
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- New user trigger (creates profile automatically)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 7. RLS POLICIES
-- =============================================================================

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" 
  ON profiles FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  TO public
  USING (auth.uid() = id);

-- Patients policies
CREATE POLICY "Users can view their own patients" 
  ON patients FOR SELECT 
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create patients" 
  ON patients FOR INSERT 
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own patients" 
  ON patients FOR UPDATE 
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own patients" 
  ON patients FOR DELETE 
  TO public
  USING (auth.uid() = user_id);

-- Diary entries policies
CREATE POLICY "Users can view diary entries for their patients" 
  ON diary_entries FOR SELECT 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = diary_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create diary entries for their patients" 
  ON diary_entries FOR INSERT 
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = diary_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update diary entries for their patients" 
  ON diary_entries FOR UPDATE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = diary_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete diary entries for their patients" 
  ON diary_entries FOR DELETE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = diary_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

-- Symptoms policies
CREATE POLICY "Users can view symptoms for their patients" 
  ON symptoms FOR SELECT 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = symptoms.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create symptoms for their patients" 
  ON symptoms FOR INSERT 
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = symptoms.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update symptoms for their patients" 
  ON symptoms FOR UPDATE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = symptoms.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete symptoms for their patients" 
  ON symptoms FOR DELETE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = symptoms.profile_id 
    AND patients.user_id = auth.uid()
  ));

-- Medications policies
CREATE POLICY "Users can view medications for their patients" 
  ON medications FOR SELECT 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = medications.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create medications for their patients" 
  ON medications FOR INSERT 
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = medications.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update medications for their patients" 
  ON medications FOR UPDATE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = medications.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete medications for their patients" 
  ON medications FOR DELETE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = medications.profile_id 
    AND patients.user_id = auth.uid()
  ));

-- Mood entries policies
CREATE POLICY "Users can view mood entries for their patients" 
  ON mood_entries FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = mood_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create mood entries for their patients" 
  ON mood_entries FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = mood_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update mood entries for their patients" 
  ON mood_entries FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = mood_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete mood entries for their patients" 
  ON mood_entries FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = mood_entries.profile_id 
    AND patients.user_id = auth.uid()
  ));

-- User sessions policies
CREATE POLICY "Users can view their own sessions" 
  ON user_sessions FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
  ON user_sessions FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
  ON user_sessions FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

-- Patient activities policies
CREATE POLICY "Users can view activities for their patients" 
  ON patient_activities FOR SELECT 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_activities.patient_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can create activities for their patients" 
  ON patient_activities FOR INSERT 
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_activities.patient_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update activities for their patients" 
  ON patient_activities FOR UPDATE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_activities.patient_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete activities for their patients" 
  ON patient_activities FOR DELETE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_activities.patient_id 
    AND patients.user_id = auth.uid()
  ));

-- Patient documents policies
CREATE POLICY "Users can view documents for their patients" 
  ON patient_documents FOR SELECT 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_documents.patient_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can upload documents for their patients" 
  ON patient_documents FOR INSERT 
  TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_documents.patient_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can update documents for their patients" 
  ON patient_documents FOR UPDATE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_documents.patient_id 
    AND patients.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete documents for their patients" 
  ON patient_documents FOR DELETE 
  TO public
  USING (EXISTS (
    SELECT 1 FROM patients 
    WHERE patients.id = patient_documents.patient_id 
    AND patients.user_id = auth.uid()
  ));

-- =============================================================================
-- 8. STORAGE BUCKETS (Execute these via Supabase Dashboard or API)
-- =============================================================================

/*
You'll need to create these storage buckets manually in the Supabase Dashboard
or via the API for each region:

1. patient-photos
   - Public: false
   - File size limit: 5MB
   - Allowed file types: image/*

2. patient-documents
   - Public: false
   - File size limit: 50MB
   - Allowed file types: *

3. user-photos
   - Public: false
   - File size limit: 5MB
   - Allowed file types: image/*

Storage policies should be created to match your user access patterns.
*/

-- =============================================================================
-- SETUP COMPLETE
-- =============================================================================

/*
This script creates a complete replica of your MiKare database structure.

To deploy:
1. Run this entire script on your UK Supabase instance
2. Run this entire script on your USA Supabase instance
3. Create the storage buckets manually in each region
4. Update your region configuration with the correct URLs and keys

Your multi-region setup will then be complete!
*/