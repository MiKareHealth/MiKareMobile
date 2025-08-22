import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { 
  User as UserIcon, 
  Camera, 
  Globe, 
  Clock, 
  CreditCard, 
  Lock, 
  AlertCircle,
  Check,
  Trash,
  Download,
  X,
  Loader,
  LogOut,
  History,
  HelpCircle,
  Users,
  Clock3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { tokens, theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import type { UserSession } from '../types/database';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useSplash } from '../contexts/SplashContext';
import { getSupabaseClient, getCurrentRegion } from '../lib/supabaseClient';
import SubscriptionPlanPanel from '../components/SubscriptionPlanPanel';
import TrialTimer from '../components/TrialTimer';
import { handleSubscription } from '../utils/stripe';
import { normalizeRegion } from '../utils/stripe';
import { useSubscription } from '../hooks/useSubscription';
import { usePatients, PatientSummary } from '../contexts/PatientsContext';
import type { PlanKey } from '../config/pricing';
import { error as logError } from '../utils/logger';
import { logLogoutEvent, testAuditTable, maskIPForDisplay } from '../utils/auditUtils';
import { useAuditEvents } from '../hooks/useAuditEvents';
import { useFreePlanUsage } from '../hooks/useFreePlanUsage';

// Define timezone options
const timezoneOptions = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET) - New York' },
  { value: 'America/Chicago', label: 'Central Time (CT) - Chicago' },
  { value: 'America/Denver', label: 'Mountain Time (MT) - Denver' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT) - Los Angeles' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT) - London' },
  { value: 'Europe/Paris', label: 'Central European Time (CET) - Paris' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST) - Tokyo' },
  { value: 'Asia/Shanghai', label: 'China Standard Time (CST) - Shanghai' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET) - Sydney' },
  { value: 'Australia/Brisbane', label: 'Australian Eastern Standard Time (AEST) - Brisbane' },
];

// Define session timeout options
const sessionTimeoutOptions = [
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 240, label: '4 hours' }
];

interface ProfileSettings {
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
}

export default function Settings() {
  const navigate = useNavigate();
  const { preferences, refreshPreferences } = useUserPreferences();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(preferences.timeFormat);
  const [sessionLength, setSessionLength] = useState<number>(30);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [latestSession, setLatestSession] = useState<UserSession | null>(null);
  const [showSessionHistory, setShowSessionHistory] = useState(true);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const { formatDateTime } = useUserPreferences();
  const { setShowSplash } = useSplash(); 
  const { isFreePlan } = useSubscription();
  const { diaryEntriesUsed, aiAnalysisUsed, loading: usageLoading } = useFreePlanUsage();
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    timezone: '',
    address: '',
    phone_number: '',
  });
  const [timezone, setTimezone] = useState(preferences.timezone);
  const { patients, loading: patientsLoading } = usePatients();
  const [sharedPatients, setSharedPatients] = useState<any[]>([]);
  const { auditEvents, loading: auditLoading } = useAuditEvents(5);

  // Get browser's timezone as default
  const getBrowserTimezone = () => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        
        if (!currentUser) {
          navigate('/signin');
          return;
        }
        
        setUser(currentUser);
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();
          
        if (profileError) throw profileError;
        
        if (profile) {
          setTimezone(profile.timezone || preferences.timezone);
          setTimeFormat(profile.time_format || preferences.timeFormat);
          setSessionLength(profile.preferred_session_length || 30);
          setProfile(profile);
          
          // Initialize form data
          setProfileForm({
            full_name: profile.full_name || '',
            timezone: profile.timezone || getBrowserTimezone(),
            address: profile.address || '',
            phone_number: profile.phone_number || '',
          });
          
          // Set photo preview if exists
          if (profile.avatar_url) {
            setPhotoPreview(profile.avatar_url);
          }

          // Fetch user's session history
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('login_time', { ascending: false })
            .limit(15);

          if (sessionsError) throw sessionsError;
          
          if (sessionsData && sessionsData.length > 0) {
            setUserSessions(sessionsData);
            setLatestSession(sessionsData[0]);
          }
        }
      } catch (err) {
        logError('Error fetching settings:', err);
        setError((err as Error).message);
      }
    };
    
    fetchSettings();
  }, [navigate, preferences.timezone, preferences.timeFormat]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Failed to initialize Supabase client');

      // Upload photo
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setPhotoPreview(publicUrl);
      setSuccessMessage('Profile photo updated successfully');
    } catch (err) {
      logError('Error uploading photo:', err);
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoButtonClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handlePhotoChange(e as unknown as React.ChangeEvent<HTMLInputElement>);
    input.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTimeFormatChange = (format: '12h' | '24h') => {
    setTimeFormat(format);
  };

  const handleSessionLengthChange = (length: number) => {
    setSessionLength(length);
  };

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClient();
      // Update settings
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          timezone: profileForm.timezone,
          time_format: timeFormat,
          preferred_session_length: sessionLength,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
      if (updateError) throw updateError;
      setSuccessMessage('Settings updated successfully');
      await refreshPreferences();
    } catch (err) {
      logError('Error updating settings:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    setDeletingAccount(true);
    setError(null);

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Failed to initialize Supabase client');

      // Delete user data
      const { error: deleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (deleteError) throw deleteError;

      // Delete user account
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
      if (authError) throw authError;

      // Sign out and redirect
      await supabase.auth.signOut();
      navigate('/signin');
    } catch (err) {
      logError('Error deleting account:', err);
      setError((err as Error).message);
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Failed to initialize Supabase client');

      // Log logout audit event (non-blocking) - use the same client instance
      if (user?.id) {
        logLogoutEvent(user.id, supabase).catch((err) => {
          logError('Failed to log logout audit event:', err);
        });
      }

      await supabase.auth.signOut();
      navigate('/signin');
    } catch (err) {
      logError('Error signing out:', err);
      setError((err as Error).message);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error('Failed to initialize Supabase client');

      // Fetch user data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;

      // Create export object
      const exportData = {
        profile,
        exportDate: new Date().toISOString()
      };

      // Convert to JSON and download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mikare-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      logError('Error exporting data:', err);
      setError((err as Error).message);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ 
          logout_time: new Date().toISOString(),
          is_active: false 
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Refresh sessions list
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('login_time', { ascending: false })
        .limit(15);

      if (sessionsData) {
        setUserSessions(sessionsData);
        setLatestSession(sessionsData.find(s => s.is_active) || sessionsData[0]);
      }

      showSuccessMessage('Session terminated successfully');
    } catch (err) {
      setError(`Failed to terminate session: ${(err as Error).message}`);
    }
  };

  const handleViewTutorial = async () => {
    // Show the splash/tutorial modal
    setShowSplash(true);
    
    showSuccessMessage('Showing introduction tutorial');
  };

  const handleTestAuditTable = async () => {
    console.log('🔍 SETTINGS: Testing audit table...');
    await testAuditTable();
  };

  const handleSubscribe = async (planKey: PlanKey) => {
    try {
      setLoading(true);
      await handleSubscription(planKey);
    } catch (error) {
      logError('Subscription error:', error);
      setError(`Subscription error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Profile & Settings">
      <div className="max-w-4xl mx-auto px-4 sm:px-0 space-y-8">
        {/* Success message */}
        {successMessage && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-fade-down">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg shadow-lg flex items-center">
              <Check className="h-5 w-5 mr-2 text-green-500" />
              <p>{successMessage}</p>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-sm">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
              <p>{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleUpdateSettings} className="space-y-8">
          {/* Section 1: Account Information */}
          <div className="bg-white shadow-sm rounded-xl p-6 space-y-6 animate-fade-down">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-heading-h2">Account Information</h2>
              <UserIcon className="h-5 w-5 text-teal-600" />
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <button 
                  type="button"
                  onClick={handlePhotoButtonClick}
                  className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-teal-500 transition-colors duration-200 relative group"
                >
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Profile Preview" 
                      className="w-full h-full object-cover"
                    />
                  ) : profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <UserIcon className="h-12 w-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                </button>
              </div>
              
              <div className="space-y-4 flex-1">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-primary">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm py-2 px-3 text-gray-500"
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    Email cannot be changed
                  </p>
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={profileForm.full_name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-2 px-3"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone_number"
                      name="phone_number"
                      value={profileForm.phone_number}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-2 px-3"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={profileForm.address}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-2 px-3"
                  />
                </div>
              </div>
            </div>
            
            {/* Recent Logins */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-800 mb-3 flex items-center">
                <History className="h-4 w-4 mr-2 text-gray-600" />
                Recent Logins
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Date & Time</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Device</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">IP Address</th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">Region</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLoading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                          <div className="animate-spin h-4 w-4 mx-auto"></div>
                          Loading...
                        </td>
                      </tr>
                    ) : auditEvents.length > 0 ? (
                      auditEvents.map((event) => (
                        <tr key={event.id}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {formatDateTime(event.event_at)}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="text-gray-600" title={event.user_agent || 'Unknown device'}>
                              {event.user_agent ? 
                                (event.user_agent.length > 40 ? 
                                  `${event.user_agent.substring(0, 40)}...` : 
                                  event.user_agent
                                ) : 
                                'Unknown device'
                              }
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="text-gray-600">
                              {maskIPForDisplay(event.ip)}
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="text-gray-600">
                              {event.region || '—'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-gray-500">
                          No recent logins recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Section 2: Preferences */}
          <div className="bg-white shadow-sm rounded-xl p-6 space-y-6 animate-fade-down">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-heading-h2">Preferences</h2>
              <Globe className="h-5 w-5 text-teal-600" />
            </div>
            
            <div className="space-y-6">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Your Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={profileForm.timezone}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-2 px-3"
                >
                  {timezoneOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time Format
                </label>
                <div className="mt-2 flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => handleTimeFormatChange('12h')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      timeFormat === '12h' 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      12-hour (AM/PM)
                    </div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleTimeFormatChange('24h')}
                    className={`px-4 py-2 text-sm font-medium rounded-md ${
                      timeFormat === '24h' 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      24-hour
                    </div>
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Session Timeout
                </label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  Choose how long your login session remains active without activity
                </p>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sessionTimeoutOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSessionLengthChange(option.value)}
                      className={`px-4 py-2 text-sm font-medium rounded-md ${
                        sessionLength === option.value
                          ? 'bg-teal-600 text-white shadow-sm' 
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-teal-600 mt-2">
                  For your security, you'll be logged out after this period of inactivity
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Application Guide
                </label>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleViewTutorial}
                    className="px-4 py-2 text-sm font-medium rounded-md bg-white border border-teal-300 text-teal-700 hover:bg-teal-50 flex items-center"
                  >
                    <HelpCircle className="h-4 w-4 mr-2 text-teal-600" />
                    Replay Introduction Tutorial
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    View the introduction again to learn about MiKare's features
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Subscription */}
          <div className="bg-white shadow-sm rounded-xl p-6 space-y-6 animate-fade-down">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-heading-h2">Subscription Plan</h2>
              <CreditCard className="h-5 w-5 text-teal-600" />
            </div>
            
            {/* Subscription Plan Panel */}
            {isFreePlan && (
              <SubscriptionPlanPanel
                currentPlanKey="free"
                region={normalizeRegion((profile?.region || getCurrentRegion()) || undefined)}
                onSubscribe={handleSubscribe}
                initialExpanded={false}
              />
            )}

            {/* Manage Subscription Panel for Paid Users */}
            {!isFreePlan && user?.email && (
              <div className="bg-white shadow-sm rounded-xl p-6 mb-4 animate-fade-down flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-1">Manage Subscription</h3>
                  <p className="text-gray-600">View or update your billing details, payment method, or cancel your subscription.</p>
                </div>
                <a
                  href={`https://billing.stripe.com/p/login/8x27sL6lh5OI0D51ARgnK00?prefilled_email=${encodeURIComponent(user.email)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-md shadow-sm transition-colors text-sm font-medium flex items-center justify-center mt-4 md:mt-0"
                >
                  Open Stripe Portal
                </a>
              </div>
            )}
            
            {/* Enhanced subscription summary table */}
            <div className="bg-white shadow-sm rounded-xl p-6 border border-gray-200 mt-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
                
                {/* Trial Timer - Show if user is on trial */}
                {profile?.trial_started_at && !profile?.trial_completed && (
                  <div className="mb-4">
                    <TrialTimer 
                      trialStartedAt={profile.trial_started_at}
                      trialDays={7} // Default to 7 days
                      onTrialEnd={() => {
                        // Refresh profile data when trial ends
                        window.location.reload();
                      }}
                    />
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <CreditCard className="h-5 w-5 text-teal-600 mr-2" />
                      <h4 className="font-medium text-gray-800">Current Plan</h4>
                    </div>
                    <p className="text-lg font-semibold text-teal-700 capitalize">
                      {profile?.subscription_plan === 'MiKare Health - free plan' ? 'MiKare Health - free plan' : profile?.subscription_plan || 'Free Plan'}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Status: <span className="font-medium text-green-600 capitalize">{profile?.subscription_status || 'inactive'}</span>
                    </p>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Users className="h-5 w-5 text-teal-600 mr-2" />
                      <h4 className="font-medium text-gray-800">People Count</h4>
                    </div>
                    <p className="text-lg font-semibold text-teal-700">{patients.length}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {patients.length === 1 ? '1 person' : `${patients.length} people`} in your account
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Free Plan Usage Status */}
              {isFreePlan && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                    <CreditCard className="h-5 w-5 text-teal-600 mr-2" />
                    Free Plan Usage
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-teal-600 mr-2" />
                        <span className="text-gray-700">Add Diary Entry</span>
                      </div>
                      <div className="flex items-center">
                        {usageLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                        ) : diaryEntriesUsed > 0 ? (
                          <div className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-sm">Available</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-purple-600 mr-2" />
                        <span className="text-gray-700">AI Analysis</span>
                      </div>
                      <div className="flex items-center">
                        {usageLoading ? (
                          <div className="animate-spin h-4 w-4 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                        ) : aiAnalysisUsed > 0 ? (
                          <div className="flex items-center text-green-600">
                            <Check className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Completed</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-gray-500">
                            <X className="h-4 w-4 mr-1" />
                            <span className="text-sm">Available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {(diaryEntriesUsed > 0 || aiAnalysisUsed > 0) && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Great! You've tried MiKare's features. Upgrade to continue using these features and unlock unlimited access.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Users className="h-5 w-5 text-teal-600 mr-2" />
                  People on Your Account
                </h4>
                <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
                  {patientsLoading ? (
                    <div className="py-4 px-6 text-center text-gray-500">
                      <div className="animate-spin h-8 w-8 mx-auto"></div>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="py-4 px-6 text-center text-gray-500">
                      <p>No people added yet</p>
                      <button
                        type="button"
                        onClick={() => navigate('/add-patient')}
                        className="mt-2 text-sm text-teal-600 hover:text-teal-700 font-medium"
                      >
                        + Add your first person
                      </button>
                    </div>
                  ) : (
                    patients.map((p) => (
                      <div key={p.id} className="py-3 px-6 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-medium mr-3">
                            {p.full_name.charAt(0)}
                          </div>
                          <span className="text-gray-800">{p.full_name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(`/patient/${p.id}`)}
                          className="text-sm text-teal-600 hover:text-teal-700"
                        >
                          View
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* People Shared With Me section */}
              <div className="mb-3">
                <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                  <Users className="h-5 w-5 text-purple-600 mr-2" />
                  People Shared With Me
                </h4>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <Clock3 className="h-6 w-6 text-purple-600" />
                    <div>
                      <h5 className="font-medium text-gray-900">Coming Soon</h5>
                      <p className="text-sm text-gray-600">
                        Shared access to profiles from other MiKare users will be available in an upcoming update.
                      </p>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-dashed border-gray-300 text-sm text-gray-500 flex items-center justify-center">
                    <p>Shared profiles will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Privacy & Data Control */}
          <div className="bg-white shadow-sm rounded-xl p-6 space-y-6 animate-fade-down">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-heading-h2">Privacy & Data Control</h2>
              <Lock className="h-5 w-5 text-teal-600" />
            </div>
            
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleExportData}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                Download My Data
              </button>
              
              <button
                type="button"
                onClick={handleTestAuditTable}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 transition-colors"
              >
                <History className="h-4 w-4 mr-2" />
                Test Audit Table
              </button>
              
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 transition-colors"
              >
                <Trash className="h-4 w-4 mr-2" />
                Delete My Account
              </button>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pb-8 animate-fade-down">
            <button
              type="submit"
              disabled={saveLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              {saveLoading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 animate-fade-down">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-heading-h2">Delete Your Account</h3>
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteAccountError(null);
                    setDeleteConfirmText('');
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mb-6">
                {/* Demo account warning */}
                {user?.email === 'demo@example.com' ? (
                  <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-amber-700 font-bold">Demo Account Restriction</p>
                        <p className="text-sm text-amber-700 mt-1">
                          The demo account cannot be deleted. This restriction is in place to maintain the demo functionality for all users.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-red-700">
                          <span className="font-bold">Warning:</span> This action cannot be undone.
                        </p>
                        <p className="text-sm text-red-700 mt-1">
                          All your data including patients, medical records, and profile information will be permanently deleted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Error message */}
                {deleteAccountError && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                      <div className="text-sm text-red-700">{deleteAccountError}</div>
                    </div>
                  </div>
                )}
                
                {user?.email !== 'demo@example.com' && (
                  <>
                    <p className="text-gray-700 mb-4">
                      To confirm, please type your email address: <span className="font-medium">{user?.email}</span>
                    </p>
                    
                    <input
                      type="email"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                      placeholder="Enter your email"
                    />
                  </>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteAccountError(null);
                    setDeleteConfirmText('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                {user?.email !== 'demo@example.com' && (
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== user?.email || deletingAccount}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingAccount ? (
                      <>
                        <Loader className="animate-spin h-4 w-4 mr-2" />
                        Deleting...
                      </>
                    ) : (
                      'Permanently Delete Account'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Photo Upload Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 animate-fade-down">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-heading-h2">Upload Profile Photo</h2>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">Choose a profile photo to display on your account.</p>
              
              <div className="mt-6">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
              </div>
              
              {photoPreview && (
                <div className="mt-6">
                  <div className="aspect-square w-40 mx-auto overflow-hidden rounded-full border-2 border-teal-100">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePhotoChange}
                  disabled={!photoFile || uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md shadow-sm hover:bg-teal-700"
                >
                  {uploading ? (
                    <>
                      <Loader className="inline h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Photo'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}