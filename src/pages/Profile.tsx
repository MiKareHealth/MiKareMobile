import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, AlertCircle } from 'lucide-react';
import { LogOut, UserPlus, ChevronLeft, Home } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SettingsMenu from '../components/SettingsMenu';
import type { Patient } from '../types/database';
import { getSupabaseClient } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { usePatients } from '../contexts/PatientsContext';
import Skeleton from '../components/Skeleton';
import { error as logError } from '../utils/logger';

interface Profile {
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  address: string | null;
  phone_number: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const { patients, loading: patientsLoading } = usePatients();
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuWidth = isMenuOpen ? 'w-64' : 'w-[130px]';

  useEffect(() => {
    const fetchProfile = async () => {
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
          setFullName(profile.full_name || '');
          setUsername(profile.username || '');
          setAvatarUrl(profile.avatar_url);
        }
      } catch (err) {
        logError('Error fetching profile:', err);
        setError((err as Error).message);
      }
    };
    
    fetchProfile();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      // First, ensure local storage is cleared
      localStorage.removeItem('sessionStart');
      localStorage.removeItem('sessionLength');
      localStorage.removeItem('supabase.auth.token');
      
      // Try to update the user's session if possible
      try {
        if (user) {
          const { data: sessions } = await supabase
            .from('user_sessions')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .order('login_time', { ascending: false })
            .limit(1);
            
          if (sessions && sessions.length > 0) {
            await supabase
              .from('user_sessions')
              .update({ 
                logout_time: new Date().toISOString(),
                is_active: false
              })
              .eq('id', sessions[0].id);
          }
        }
      } catch (err) {
        logError('Error updating session on logout:', err);
        // Continue with sign out even if session update fails
      }
      
      // Attempt to sign out with retry logic
      let signOutAttempts = 0;
      const maxAttempts = 3;
      let signOutSuccess = false;
      
      while (signOutAttempts < maxAttempts && !signOutSuccess) {
        try {
          await supabase.auth.signOut();
          signOutSuccess = true;
        } catch (error) {
          logError(`Sign out attempt ${signOutAttempts + 1} failed:`, error);
          signOutAttempts++;
          if (signOutAttempts < maxAttempts) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }
      
      // Always clear all local storage as a failsafe
      localStorage.clear();
      
      // Redirect to signin regardless of server-side logout success
      navigate('/signin');
    } catch (error) {
      logError('Error during sign out process:', error);
      // Force client-side logout
      localStorage.clear();
      navigate('/signin');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          username: username.trim(),
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      logError('Error updating profile:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Profile">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white shadow-sm rounded-xl p-6">
            <div className="flex items-center space-x-6 mb-6">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="min-h-screen bg-background-default">
      {/* Side Menu */}
      <div className={`fixed inset-y-0 left-0 bg-white shadow-lg transform transition-all duration-300 ease-in-out ${menuWidth} z-30`}>
        <div className="h-full flex flex-col">
          {/* Menu Header */}
          <div className={`relative ${isMenuOpen ? 'w-64' : 'w-[130px]'}`}>
            <img 
              src={isMenuOpen 
                ? "https://www.trimation.com.au/wp-content/uploads/2025/04/Prometheus-open-side-menu-png.avif"
                : "https://www.trimation.com.au/wp-content/uploads/2025/04/Prometheus-closed-side-menu-png.avif"
              }
              alt="Prometheus"
              className="w-full h-[200px] object-contain px-4"
            />
          </div>

          {/* Collapse/Expand Buttons */}
          <div className="absolute top-1/2 right-0 transform translate-y-[-50%]">
            <button
              onClick={() => setIsMenuOpen(false)}
              className={`absolute -right-5 p-2 bg-white rounded-r-md shadow-md hover:bg-background-subtle focus:outline-none ${isMenuOpen ? '' : 'hidden'}`}
            >
              <ChevronLeft className="h-5 w-5 text-text-secondary" />
            </button>
            <button
              onClick={() => setIsMenuOpen(true)}
              className={`absolute -right-5 p-2 bg-white rounded-r-md shadow-md hover:bg-background-subtle focus:outline-none ${isMenuOpen ? 'hidden' : ''}`}
            >
              <ChevronLeft className="h-5 w-5 text-text-secondary rotate-180" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <button
              onClick={() => navigate('/add-patient')}
              className={`w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${isMenuOpen ? '' : 'px-2'}`}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              <span className={`transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                Add Patient
              </span>
            </button>

            {patients.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className={`text-sm font-medium text-text-secondary ${isMenuOpen ? '' : 'text-center'}`}>
                  {isMenuOpen ? 'My Patients' : 'Patients'}
                </h3>
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => navigate(`/patient/${patient.id}`)}
                    className={`w-full flex items-center px-2 py-2 text-sm text-text-primary rounded-md hover:bg-background-subtle ${isMenuOpen ? '' : 'justify-center'}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-background-subtle mr-2">
                      {patient.photo_url ? (
                        <img
                          src={patient.photo_url}
                          alt={patient.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600">
                          {patient.full_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={`truncate transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 hidden'}`}>
                      {patient.full_name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t">
            <SettingsMenu isMenuOpen={isMenuOpen} />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <nav className={`bg-white shadow transition-all duration-300 ease-in-out ${isMenuOpen ? 'ml-64' : 'ml-[130px]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="inline-flex items-center text-text-secondary hover:text-text-primary"
              >
                <Home className="h-5 w-5" />
              </button>
              <span className="text-text-tertiary">/</span>
              <span className="text-xl font-semibold text-text-primary">Profile Settings</span>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className={`max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 transition-all duration-300 ease-in-out ${isMenuOpen ? 'ml-64' : 'ml-[130px]'}`}>
        <div className="max-w-3xl mx-auto">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-text-primary">Profile Information</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 text-sm font-medium text-primary hover:text-primary-dark"
                >
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="mt-1 block w-full rounded-md border-border-default bg-background-subtle shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary">Full Name</label>
                    <input
                      type="text"
                      name="full_name"
                      defaultValue={profile?.full_name || ''}
                      className="mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary">Address</label>
                    <input
                      type="text"
                      name="address"
                      defaultValue={profile?.address || ''}
                      className="mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-primary">Phone Number</label>
                    <input
                      type="tel"
                      name="phone_number"
                      defaultValue={profile?.phone_number || ''}
                      className="mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                    />
                  </div>

                  {error && (
                    <div className="rounded-md bg-red-50 p-4">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Email</label>
                    <p className="mt-1 text-sm text-text-primary">{user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Username</label>
                    <p className="mt-1 text-sm text-text-primary">{profile?.username}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Full Name</label>
                    <p className="mt-1 text-sm text-text-primary">{profile?.full_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Address</label>
                    <p className="mt-1 text-sm text-text-primary">{profile?.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary">Phone Number</label>
                    <p className="mt-1 text-sm text-text-primary">{profile?.phone_number}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}