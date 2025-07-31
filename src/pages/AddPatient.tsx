import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { Camera, ChevronLeft, Home, X, AlertCircle } from 'lucide-react';
import { getSupabaseClient, getCurrentRegion, switchToRegion } from '../lib/supabaseClient';
import Layout from '../components/Layout';
import { tokens } from '../styles/tokens';
import type { Patient } from '../types/database';
import { Region } from '../lib/regionDetection';
import { usePatients } from '../contexts/PatientsContext';

export default function AddPatient() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [currentRegion, setCurrentRegion] = useState<Region | null>(null);
  const [storedRegion, setStoredRegion] = useState<Region | null>(null);
  const { refreshPatients } = usePatients();

  useEffect(() => {
    const initializeClient = async () => {
      try {
        // Get the current region from localStorage
        const currentRegion = getCurrentRegion();
        console.log('Current region from localStorage:', currentRegion);
        
        // Initialize client with the current region
        let client = await getSupabaseClient();
        console.log('Initialized Supabase client for region:', currentRegion);
        
        setSupabaseClient(client);
        setCurrentRegion(currentRegion);
        
        // Get the current user
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('Not authenticated');
        
        console.log('Current user:', user.id);
        console.log('User metadata:', user.user_metadata);
        setUser(user);
      } catch (err) {
        console.error('Error initializing Supabase client:', err);
        setError('Failed to initialize client. Please try signing in again.');
        navigate('/signin');
      }
    };

    initializeClient();
  }, [navigate]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignOut = async () => {
    if (!supabaseClient) return;
    await supabaseClient.auth.signOut();
    navigate('/signin');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!supabaseClient || !user) {
      setError('Client not initialized or user not authenticated');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      // Verify user is still authenticated
      const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
      if (userError) throw userError;
      if (!currentUser) throw new Error('Not authenticated');
      if (currentUser.id !== user.id) throw new Error('User session mismatch');

      // 1. Create patient record (without photo_url)
      const patientData: Partial<Patient> = {
        user_id: user.id,
        full_name: formData.get('full_name') as string,
        dob: formData.get('dob') as string,
        gender: formData.get('gender') as 'Male' | 'Female' | 'Other',
        relationship: formData.get('relationship') as string,
        country: formData.get('country') as string,
        address: formData.get('address') as string,
        phone_number: formData.get('phone_number') as string,
        photo_url: null,
        notes: formData.get('notes') as string,
      };

      const { data: inserted, error: insertError } = await supabaseClient
        .from('patients')
        .insert(patientData)
        .select('id')
        .single();

      if (insertError) {
        console.error('Error inserting patient:', insertError);
        throw insertError;
      }
      const patientId = inserted?.id;
      if (!patientId) throw new Error('Failed to get new patient ID');

      // Ensure patient record is visible to RLS
      let rlsVisible = false;
      for (let i = 0; i < 5; i++) {
        const { data: check, error: checkError } = await supabaseClient
          .from('patients')
          .select('id')
          .eq('id', patientId)
          .eq('user_id', user.id)
          .single();
        if (check && check.id === patientId) {
          rlsVisible = true;
          break;
        }
        await new Promise(res => setTimeout(res, 100));
      }
      if (!rlsVisible) throw new Error('Patient record not visible to RLS after insert');

      // Navigate to patient details page immediately (show skeleton loading)
      navigate(`/patient/${patientId}`);

      // Wait 2 seconds for RLS propagation before uploading photo
      await new Promise(res => setTimeout(res, 2000));

      // 2. Upload photo if present
      let photoUrl = null;
      if (photoFile) {
        try {
          // Optionally show a loading state here if you want
          const fileName = `${user.id}/${photoFile.name}`;
          console.log('Uploading photo:', { fileName, userId: user.id });

          // Upload the file (assume bucket exists)
          const { error: uploadError } = await supabaseClient.storage
            .from('user-photos')
            .upload(fileName, photoFile, {
              cacheControl: '3600',
              upsert: false
            });
          if (uploadError) {
            console.error('Photo upload error details:', {
              fileName,
              userId: user.id,
              uploadError
            });
            throw uploadError;
          }

          const { data: { publicUrl } } = supabaseClient.storage
            .from('user-photos')
            .getPublicUrl(fileName);
          photoUrl = publicUrl;

          // 3. Update patient record with photo_url
          const { error: updateError } = await supabaseClient
            .from('patients')
            .update({ photo_url: photoUrl })
            .eq('id', patientId);
          if (updateError) throw updateError;
        } catch (uploadErr) {
          console.error('Error handling photo upload:', uploadErr);
          // Continue without the photo if upload fails
        }
      }

      await refreshPatients();
      // Poll for up to 2 seconds for the new patient to appear in context
      const start = Date.now();
      let found = false;
      while (Date.now() - start < 2000) {
        // Use the latest patients from context
        const { patients } = require('../contexts/PatientsContext');
        // Check if the new patient is present
        if (patients && patients.some((p: any) => p.id === patientId)) {
          found = true;
          break;
        }
        await new Promise(res => setTimeout(res, 100));
      }
      navigate('/');
    } catch (err) {
      console.error('Error creating patient:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Add New Person">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden animate-fade-down-delay delay-0">
          {/* Patient Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowPhotoModal(true)}
                    className="group relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 hover:border-teal-500 flex items-center justify-center transition-colors duration-200"
                  >
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl font-semibold text-gray-400">+</span>
                    )}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center rounded-full">
                      <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </button>
                </div>
                <div>
                  <h2 className={tokens.typography.sizes.h2}>Add New Person</h2>
                  <p className="text-gray-500 animate-fade-down-delay delay-2">Enter details below</p>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Form */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6 animate-fade-down-delay delay-1">
              {/* Photo upload modal */}
              {showPhotoModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 animate-fade-down">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className={tokens.typography.sizes.h2}>Upload Photo</h2>
                      <button
                        type="button"
                        onClick={() => setShowPhotoModal(false)}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">Choose a photo for this patient.</p>
                    
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="mt-4 block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-medium
                        file:bg-teal-50 file:text-teal-700
                        hover:file:bg-teal-100"
                    />
                    
                    {photoPreview && (
                      <div className="mt-4">
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
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="full_name"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <div className="mt-1">
                    <input
                      type="date"
                      name="dob"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <div className="mt-1">
                    <select
                      name="gender"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Relationship
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="relationship"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="country"
                      required
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Phone Number
                  </label>
                  <div className="mt-1">
                    <input
                      type="tel"
                      name="phone_number"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Address
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="address"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Notes
                  </label>
                  <div className="mt-1">
                    <textarea
                      name="notes"
                      rows={3}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-3 px-4 text-base"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <div className="text-sm text-red-700">{error}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 border border-transparent rounded-md shadow-sm"
                >
                  {loading ? 'Saving...' : 'Save Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}