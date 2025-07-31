export type Patient = {
  id: string;
  user_id: string;
  full_name: string;
  dob: string;
  gender: 'Male' | 'Female' | 'Other';
  relationship: string;
  country: string;
  address: string;
  phone_number: string;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type MedicationStatus = 'Active' | 'Inactive';

export type Medication = {
  id: string;
  profile_id: string;
  medication_name: string;
  start_date: string;
  end_date: string | null;
  dosage: string;
  status: MedicationStatus;
  prescribed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DiaryEntryType = 'Symptom' | 'Appointment' | 'Diagnosis' | 'Note' | 'Treatment' | 'Other' | 'AI';

export type DiaryEntry = {
  id: string;
  profile_id: string;
  entry_type: DiaryEntryType;
  title: string;
  date: string;
  notes: string | null;
  severity: string | null;
  attendees: string[];
  file_url: string | null;
  created_at: string;
  updated_at: string;
  ai_type?: string | null;
  source_entries?: string[] | null;
};

export type PatientActivity = {
  id: string;
  patient_id: string;
  title: string;
  activity_type: string;
  activity_date: string;
  follow_up_date: string | null;
  notes: string | null;
  structured_outcome: {
    diagnosis_given?: boolean;
    new_test_ordered?: boolean;
    medication_changed?: boolean;
    [key: string]: any;
  } | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type PatientDocument = {
  id: string;
  patient_id: string;
  activity_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  description: string | null;
  uploaded_by: string;
  uploaded_at: string;
  diary_entry_id?: string | null;
  summary?: string | null;
};

export type Symptom = {
  id: string;
  profile_id: string;
  description: string;
  start_date: string;
  end_date: string | null;
  severity: 'Mild' | 'Moderate' | 'Severe';
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type UserSession = {
  id: string;
  user_id: string;
  login_time: string;
  logout_time: string | null;
  session_length_minutes: number;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
};

export type MoodEntry = {
  id: string;
  profile_id: string;
  date: string;
  body: number;
  mind: number;
  sleep: number;
  mood: number;
  notes: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  timezone?: string;
  time_format?: string;
  subscription_plan?: string;
  subscription_status?: string;
  trial_started_at?: string;
  trial_completed?: boolean;
  last_login?: string;
  address?: string;
  phone_number?: string;
  preferred_session_length?: number;
  region?: string;
  updated_at: string;
};