import React, { useEffect, useState, useRef } from 'react';
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
import SubscriptionPlanPanel, { SubscriptionPlanPanelRef } from '../components/SubscriptionPlanPanel';
import { normalizeRegion } from '../utils/stripe';
import type { PlanKey } from '../config/pricing';
import SubscriptionFeatureBlock from '../components/SubscriptionFeatureBlock';
import { useSubscription } from '../hooks/useSubscription';
import { usePatients, PatientSummary } from '../contexts/PatientsContext';
import { usePatientOverview } from '../hooks/usePatientOverview';
import DiaryEntryModal from '../components/DiaryEntryModal';
import SymptomModal from '../components/SymptomModal';
import { MdOutlineSick } from 'react-icons/md';
import { log, error as logError } from '../utils/logger';
import { useFreePlanUsage } from '../hooks/useFreePlanUsage';
import { Check, X } from 'lucide-react';

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
  const [userLoading, setUserLoading] = useState(true);
  const { patients, loading: patientsLoading, refreshPatients } = usePatients();
  const { preferences } = useUserPreferences();
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { isFreePlan, isLoading: subscriptionLoading } = useSubscription();
  const [showDiaryEntryModal, setShowDiaryEntryModal] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const { diaryEntriesUsed, aiAnalysisUsed, canAddDiaryEntry, canUseAI, loading: usageLoading, refresh: refreshUsage } = useFreePlanUsage();
  
  // State for subscription panel expansion
  const [subscriptionPanelExpanded, setSubscriptionPanelExpanded] = useState(false);
  const subscriptionPanelRef = useRef<SubscriptionPlanPanelRef>(null);

  // Fetch user and profile data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setUserLoading(true);
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
          log('[Dashboard] User authenticated, patients loading handled by context');
        }
      } catch (error) {
        logError('[Dashboard] Error fetching user data:', error);
      } finally {
        setUserLoading(false);
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

  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setSubscriptionPanelExpanded(true);
    // Use setTimeout to ensure state update happens before focus
    setTimeout(() => {
      subscriptionPanelRef.current?.focus();
    }, 100);
  };

  // Show skeleton loading while any data is loading
  if (userLoading || patientsLoading || usageLoading || subscriptionLoading) {
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
          
          {/* Subscription Plan Skeleton */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <Skeleton className="h-6 w-1/4 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
          
          {/* Free Plan Usage Skeleton */}
          <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
            <Skeleton className="h-6 w-1/3 mb-4" />
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Skeleton className="h-5 w-5 rounded mr-3" />
                  <div>
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Skeleton className="h-5 w-5 rounded mr-3" />
                  <div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
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

          {/* Free Plan Features Section */}
          {isFreePlan && !usageLoading && (
            <div className="space-y-4">
              {/* Free Plan Features */}
              <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Free Plan Features</h3>
                <p className="text-gray-600 mb-4">
                  Add your first person to start using MiKare's features and experience the power of AI-powered health tracking.
                </p>
              </div>
              
              {/* Free Plan Limitations */}
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

        {/* Free Plan Features Section */}
        {isFreePlan && !usageLoading && (
          <div className="space-y-4">
            {/* Welcome Message for New Users */}
            {patients.length === 1 && diaryEntriesUsed === 0 && aiAnalysisUsed === 0 && (
              <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <span className="text-teal-600 text-lg">🎉</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-teal-900 mb-2">
                      Welcome to MiKare!
                    </h3>
                    <p className="text-teal-800 mb-4">
                      You've added your first person to MiKare. Now let's get started with tracking your health journey! 
                      Try these features to experience the power of AI-powered health management.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-teal-600 text-xs font-bold">1</span>
                        </div>
                        <span className="text-teal-800">Add your first diary entry to record health events</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-6 h-6 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-teal-600 text-xs font-bold">2</span>
                        </div>
                        <span className="text-teal-800">Use AI analysis to get insights and suggestions (available after adding a diary entry)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Free Plan Features */}
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Free Plan Features</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <FileText className="h-5 w-5 text-teal-600 mr-3" />
                    <div>
                      <span className="text-gray-700 font-medium">Add Diary Entry</span>
                      <p className="text-xs text-gray-500 mt-1">Record your first health note</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {usageLoading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                    ) : diaryEntriesUsed > 0 ? (
                      <div className="flex items-center text-green-600">
                        <Check className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium line-through">Completed</span>
                      </div>
                    ) : patients.length > 0 ? (
                      <button
                        onClick={() => {
                          const firstPatient = patients[0];
                          navigate(`/patient/${firstPatient.id}`);
                        }}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-md transition-colors duration-200"
                      >
                        Try Now
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">Add a person first</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-purple-600 mr-3" />
                    <div>
                      <span className="text-gray-700 font-medium">AI Analysis</span>
                      <p className="text-xs text-gray-500 mt-1">Get AI insights on your health data</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {usageLoading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                    ) : aiAnalysisUsed > 0 ? (
                      <div className="flex items-center text-green-600">
                        <Check className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium line-through">Completed</span>
                      </div>
                    ) : diaryEntriesUsed > 0 && patients.length > 0 ? (
                      <button
                        onClick={() => {
                          const firstPatient = patients[0];
                          navigate(`/patient/${firstPatient.id}`);
                        }}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-md transition-colors duration-200"
                      >
                        Try Now
                      </button>
                    ) : (
                      <span className="text-sm text-gray-500">
                        {diaryEntriesUsed === 0 ? "Add diary entry first" : "Add a person first"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              {(diaryEntriesUsed > 0 || aiAnalysisUsed > 0) && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Great! You've tried MiKare's features. 
                    <button 
                      onClick={handleUpgradeClick}
                      className="ml-1 font-medium underline hover:text-blue-900"
                    >
                      Upgrade your plan
                    </button> to continue using these features and unlock unlimited access.
                  </p>
                </div>
              )}
            </div>
            
            {/* Free Plan Limitations */}
            <SubscriptionPlanPanel
              ref={subscriptionPanelRef}
              currentPlanKey="free"
              region={normalizeRegion(getCurrentRegion() || undefined)}
              onSubscribe={() => {}}
              expanded={subscriptionPanelExpanded}
              onExpandedChange={setSubscriptionPanelExpanded}
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
        onEntrySaved={() => {
          refreshPatients();
          refreshUsage();
        }}
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