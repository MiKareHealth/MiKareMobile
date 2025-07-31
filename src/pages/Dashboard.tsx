import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { Calendar, Smile, ChevronRight, FileText, AlertCircle } from 'lucide-react';
import { getSupabaseClient, getCurrentRegion } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import MoodEntryModal from '../components/MoodEntryModal';
import HealthAnalyticsCards from '../components/HealthAnalyticsCards';
import type { Patient, MoodEntry } from '../types/database';
import type { DiaryEntry } from '../types/database';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { getEmoji } from '../utils/moodUtils';
import { isToday, getCurrentDateInTimezone } from '../utils/timeUtils';
import { tokens, theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import Skeleton from '../components/Skeleton';
import SubscriptionPlanPanel from '../components/SubscriptionPlanPanel';
import { normalizeRegion } from '../utils/stripe';
import type { PlanKey } from '../config/pricing';
import SubscriptionFeatureBlock from '../components/SubscriptionFeatureBlock';
import { useSubscription } from '../hooks/useSubscription';
import { usePatients, PatientSummary } from '../contexts/PatientsContext';
import { usePatientOverview } from '../hooks/usePatientOverview';
import DiaryEntryModal from '../components/DiaryEntryModal';
import SymptomModal from '../components/SymptomModal';
import { MdOutlineSick } from 'react-icons/md';

interface Profile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_plan?: string;
  subscription_status?: string;
}

interface PatientWithLastEntry extends Patient {
  lastEntry?: DiaryEntry;
  todaysMood?: MoodEntry;
  medications?: any[];
  diaryEntries?: DiaryEntry[];
  moodEntries?: MoodEntry[];
}

function getLocaleFromTimezone(timezone: string): string {
  if (timezone.startsWith('Australia/')) return 'en-AU';
  if (timezone.startsWith('Europe/')) return 'en-GB';
  if (timezone.startsWith('America/')) return 'en-US';
  if (timezone.startsWith('Asia/')) return 'en-SG'; // fallback for Asia
  return 'en-GB'; // Default to UK style
}

function formatDateWithLongMonth(date: string | Date, timezone: string) {
  if (!date) return '';
  const locale = getLocaleFromTimezone(timezone);
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      year: 'numeric',
      month: 'long', // Spell out the month
      day: 'numeric',
    };
    return new Date(date).toLocaleDateString(locale, options);
  } catch (error) {
    return new Date(date).toLocaleDateString(locale);
  }
}

function PatientOverviewCard({ patient, isFreePlan, handleDiaryEntry, handleSymptomEntry, handleMoodEntry }: {
  patient: PatientSummary;
  isFreePlan: boolean;
  handleDiaryEntry: (id: string) => void;
  handleSymptomEntry: (id: string) => void;
  handleMoodEntry: (id: string) => void;
}) {
  const { overview, loading } = usePatientOverview(patient.id);
  const { preferences } = useUserPreferences();
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-primary to-secondary rounded-xl overflow-hidden shadow-lg">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-start">
            <div className="mr-4 flex-shrink-0">
              {patient.photo_url ? (
                <img
                  src={patient.photo_url}
                  alt={patient.full_name}
                  className="h-16 w-16 rounded-full object-cover border-4 border-white/20 dark:border-neutral-800"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center border-4 border-white/20">
                  <span className="text-2xl font-semibold text-white">
                    {patient.full_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white dark:text-gray-100">{patient.full_name}</h3>
              <p className="text-white/80">{patient.relationship}</p>
              {loading ? (
                <div className="mt-2 text-white/80 text-sm"><Skeleton className="h-4 w-24" /></div>
              ) : overview && overview.lastEntry ? (
                <div className="mt-2 flex items-center text-white/80 text-sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Last entry: {formatDateWithLongMonth(overview.lastEntryDate!, preferences.timezone)}</span>
                </div>
              ) : (
                <p className="mt-2 text-sm text-white/80">No entries yet</p>
              )}
            </div>
          </div>
          <div className="flex flex-row items-center gap-3">
            {/* Feature-gated action buttons */}
            {!isFreePlan && (
              <>
                {/* Mobile: 2x2 grid */}
                <div className="grid grid-cols-2 gap-2 mb-2 sm:hidden">
                  <button
                    onClick={() => handleDiaryEntry(patient.id)}
                    className="flex flex-col items-center w-24 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                    aria-label="Add Diary Entry"
                  >
                    <Calendar className="h-5 w-5 mb-1" />
                    Diary
                  </button>
                  <button
                    onClick={() => handleSymptomEntry(patient.id)}
                    className="flex flex-col items-center w-24 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                    aria-label="Add Symptom"
                  >
                    <MdOutlineSick className="h-5 w-5 mb-1" />
                    Symptom
                  </button>
                  <button
                    onClick={() => handleMoodEntry(patient.id)}
                    className="flex flex-col items-center w-24 bg-gradient-to-br from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                    aria-label="Add Mood Entry"
                  >
                    <Smile className="h-5 w-5 mb-1" />
                    Mood
                  </button>
                  <button
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className="flex flex-col items-center w-24 bg-background-default text-primary hover:bg-background-light rounded-lg text-sm font-medium transition-colors duration-200 shadow-md"
                  >
                    View Details
                  </button>
                </div>
                {/* Desktop: row */}
                <div className="hidden sm:flex flex-row gap-2 items-center">
                  <button
                    onClick={() => handleDiaryEntry(patient.id)}
                    className="flex flex-col items-center w-24 bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                    aria-label="Add Diary Entry"
                  >
                    <Calendar className="h-5 w-5 mb-1" />
                    Diary
                  </button>
                  <button
                    onClick={() => handleSymptomEntry(patient.id)}
                    className="flex flex-col items-center w-24 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                    aria-label="Add Symptom"
                  >
                    <MdOutlineSick className="h-5 w-5 mb-1" />
                    Symptom
                  </button>
                  <button
                    onClick={() => handleMoodEntry(patient.id)}
                    className="flex flex-col items-center w-24 bg-gradient-to-br from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 px-4 py-2 text-sm font-medium"
                    aria-label="Add Mood Entry"
                  >
                    <Smile className="h-5 w-5 mb-1" />
                    Mood
                  </button>
                  <button
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className="px-4 py-2 bg-background-default text-primary hover:bg-background-light rounded-lg text-sm font-medium transition-colors duration-200 shadow-md ml-2 w-24"
                  >
                    View Details
                  </button>
                </div>
              </>
            )}
            {/* If free plan, always show View Details button */}
            {isFreePlan && (
              <button
                onClick={() => navigate(`/patient/${patient.id}`)}
                className="px-4 py-2 bg-background-default text-primary hover:bg-background-light rounded-lg text-sm font-medium transition-colors duration-200 shadow-md w-24"
              >
                View Details
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { patients, loading: patientsLoading, refreshPatients } = usePatients();
  const { preferences } = useUserPreferences();
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { isFreePlan } = useSubscription();
  const [showDiaryEntryModal, setShowDiaryEntryModal] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);

  // Fetch user and profile data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = await getSupabaseClient();
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser(user);
          
          // Get user profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username, full_name, avatar_url, subscription_plan, subscription_status')
            .eq('id', user.id)
            .single();
            
          if (profileData) {
            setProfile(profileData);
          }
          
          // Note: Patients are already being loaded by PatientsContext
          // No need to manually trigger refreshPatients() here
          console.log('[Dashboard] User authenticated, patients loading handled by context');
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, []); // Removed refreshPatients dependency

  const handleMoodEntry = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowMoodModal(true);
  };

  const handleDiaryEntry = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowDiaryEntryModal(true);
  };

  const handleSymptomEntry = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowSymptomModal(true);
  };

  if (patientsLoading) {
    return (
      <Layout title="Home">
        <div className="space-y-6 px-4 py-6 sm:px-0">
          {/* Profile Card Skeleton */}
          <div className="bg-gradient-to-br from-white to-teal-50/30 dark:from-neutral-900 dark:to-neutral-800 shadow-lg rounded-xl p-8 border border-teal-100/20 dark:border-neutral-800">
            <Skeleton className="h-8 w-1/3 mb-4" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-6 w-1/3" />
            </div>
          </div>
          {/* Patient Cards Skeleton */}
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="bg-background-default shadow-lg rounded-xl p-6 border border-border">
              <div className="flex items-center space-x-4 mb-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ))}
        </div>
      </Layout>
    );
  }

  // If not loading but no patients, show empty state
  if (!patientsLoading && patients.length === 0) {
    return (
      <Layout title="Home">
        <div className="space-y-6 px-4 py-6 sm:px-0">
          {/* Profile Card */}
          <div className="bg-gradient-to-br from-background-default to-background-light shadow-lg rounded-xl p-8 border border-border">
            <h2 className="text-xl font-semibold text-text-primary">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary">Email</label>
                <p className="mt-1 text-sm text-text-secondary">{user?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary">Username</label>
                <p className="mt-1 text-sm text-text-secondary">{profile?.username}</p>
              </div>
              {profile?.full_name && (
                <div>
                  <label className="block text-sm font-medium text-primary">Full Name</label>
                  <p className="mt-1 text-sm text-text-secondary">{profile.full_name}</p>
                </div>
              )}
            </div>
          </div>

          {/* Subscription Plan Banner */}
          {isFreePlan && (
            <div className="my-4">
              <SubscriptionPlanPanel
                currentPlanKey="free"
                region={normalizeRegion(getCurrentRegion() || undefined)}
                onSubscribe={() => {}}
                initialExpanded={false}
              />
            </div>
          )}

          {/* Empty State */}
          <div className="bg-background-default rounded-lg p-8 text-center">
            <h3 className="text-lg font-medium text-text-primary">
              No people on your care list yet
            </h3>
            <p className="text-text-secondary mb-4">
              Get started by adding your first person
            </p>
            <button
              onClick={() => navigate('/add-patient')}
              className="px-6 py-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-medium rounded-md shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            >
              Add Person
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Home">
      <div className="space-y-6 px-4 py-6 sm:px-0">
        {/* Profile Card */}
        <div className="bg-gradient-to-br from-background-default to-background-light shadow-lg rounded-xl p-8 border border-border">
          <h2 className="text-xl font-semibold text-text-primary">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary">Email</label>
              <p className="mt-1 text-sm text-text-secondary">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary">Username</label>
              <p className="mt-1 text-sm text-text-secondary">{profile?.username}</p>
            </div>
            {profile?.full_name && (
              <div>
                <label className="block text-sm font-medium text-primary">Full Name</label>
                <p className="mt-1 text-sm text-text-secondary">{profile.full_name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Plan Banner */}
        {isFreePlan && (
          <div className="my-4">
            <SubscriptionPlanPanel
              currentPlanKey="free"
              region={normalizeRegion(getCurrentRegion() || undefined)}
              onSubscribe={() => {}}
              initialExpanded={false}
            />
          </div>
        )}

        {/* Patients Cards */}
        <div className="space-y-6">
          {patients.map((patient) => (
            <PatientOverviewCard
              key={patient.id}
              patient={patient}
              isFreePlan={isFreePlan}
              handleDiaryEntry={handleDiaryEntry}
              handleSymptomEntry={handleSymptomEntry}
              handleMoodEntry={handleMoodEntry}
            />
          ))}
        </div>
      </div>

      {/* Modals */}
      <DiaryEntryModal
        isOpen={showDiaryEntryModal}
        onClose={() => setShowDiaryEntryModal(false)}
        profileId={selectedPatientId || ''}
        selectedDate={new Date()}
        onEntrySaved={refreshPatients}
      />
      <SymptomModal
        isOpen={showSymptomModal}
        onClose={() => setShowSymptomModal(false)}
        patientId={selectedPatientId || ''}
        onSuccess={refreshPatients}
      />
      <MoodEntryModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        patientId={selectedPatientId || ''}
        onSuccess={refreshPatients}
      />
    </Layout>
  );
}