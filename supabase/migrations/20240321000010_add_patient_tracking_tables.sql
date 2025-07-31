-- Create required enums
CREATE TYPE diary_entry_type AS ENUM (
  'Appointment',
  'Diagnosis',
  'Note',
  'Treatment',
  'Other',
  'AI'
);

CREATE TYPE symptom_severity AS ENUM ('Mild', 'Moderate', 'Severe');

CREATE TYPE medication_status AS ENUM ('Active', 'Inactive');

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
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

-- Create symptoms table
CREATE TABLE IF NOT EXISTS public.symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  severity symptom_severity NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create medications table
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
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

-- Create mood_entries table
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  date date DEFAULT CURRENT_DATE NOT NULL,
  body integer NOT NULL CHECK (body >= 1 AND body <= 5),
  mind integer NOT NULL CHECK (mind >= 1 AND mind <= 5),
  sleep integer NOT NULL CHECK (sleep >= 1 AND sleep <= 5),
  mood integer NOT NULL CHECK (mood >= 1 AND mood <= 5),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(profile_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for diary_entries
CREATE POLICY "Users can view diary entries for their patients"
  ON public.diary_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create diary entries for their patients"
  ON public.diary_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update diary entries for their patients"
  ON public.diary_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete diary entries for their patients"
  ON public.diary_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = diary_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Create RLS policies for symptoms
CREATE POLICY "Users can view symptoms for their patients"
  ON public.symptoms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create symptoms for their patients"
  ON public.symptoms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update symptoms for their patients"
  ON public.symptoms FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete symptoms for their patients"
  ON public.symptoms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = symptoms.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Create RLS policies for medications
CREATE POLICY "Users can view medications for their patients"
  ON public.medications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create medications for their patients"
  ON public.medications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update medications for their patients"
  ON public.medications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete medications for their patients"
  ON public.medications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = medications.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Create RLS policies for mood_entries
CREATE POLICY "Users can view mood entries for their patients"
  ON public.mood_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = mood_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create mood entries for their patients"
  ON public.mood_entries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = mood_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update mood entries for their patients"
  ON public.mood_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = mood_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete mood entries for their patients"
  ON public.mood_entries FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.patients
      WHERE patients.id = mood_entries.profile_id
      AND patients.user_id = auth.uid()
    )
  );

-- Create updated_at triggers
CREATE TRIGGER handle_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_symptoms_updated_at
  BEFORE UPDATE ON public.symptoms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Grant access to authenticated users
GRANT ALL ON public.diary_entries TO authenticated, anon;
GRANT ALL ON public.symptoms TO authenticated, anon;
GRANT ALL ON public.medications TO authenticated, anon;
GRANT ALL ON public.mood_entries TO authenticated, anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon; 