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
import { log, error as logError } from '../utils/logger';

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
  const { addPatient, isAddingPatient } = usePatients();

  // Use React Query loading state for patient creation
  const isLoading = loading || isAddingPatient;

  useEffect(() => {
    const initializeClient = async () => {
      try {
        const client = await getSupabaseClient();
        setSupabaseClient(client);
        
        const { data: { user } } = await client.auth.getUser();
        if (!user) {
          navigate('/signin');
          return;
        }
        setUser(user);
        
        const region = getCurrentRegion();
        setCurrentRegion(region);
        setStoredRegion(localStorage.getItem('mikare_selected_region') as Region);
      } catch (err) {
        logError('Error initializing client:', err);
        setError('Failed to initialize application');
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

      // Prepare patient data
      const patientData = {
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

      console.log('🔍 ADD PATIENT: About to insert patient:', patientData.full_name);
      
      // Use the React Query-based addPatient function
      const newPatient = await addPatient(patientData);
      
      console.log('🔍 ADD PATIENT: Patient created successfully with ID:', newPatient.id);

      // Handle photo upload if provided
      if (photoFile) {
        try {
          const fileExt = photoFile.name.split('.').pop();
          const fileName = `${newPatient.id}-${Date.now()}.${fileExt}`;
          const filePath = `patient-photos/${fileName}`;

          const { error: uploadError } = await supabaseClient.storage
            .from('patient-photos')
            .upload(filePath, photoFile);

          if (uploadError) {
            console.error('🔍 ADD PATIENT: Error uploading photo:', uploadError);
            logError('Error uploading photo:', uploadError);
            // Don't throw here - patient was created successfully
          } else {
            // Get public URL and update patient record
            const { data: { publicUrl } } = supabaseClient.storage
              .from('patient-photos')
              .getPublicUrl(filePath);

            // Update the patient with the photo URL
            const { error: updateError } = await supabaseClient
              .from('patients')
              .update({ photo_url: publicUrl })
              .eq('id', newPatient.id);

            if (updateError) {
              console.error('🔍 ADD PATIENT: Error updating patient with photo:', updateError);
              logError('Error updating patient with photo:', updateError);
            } else {
              console.log('🔍 ADD PATIENT: Photo uploaded and patient updated successfully');
            }
          }
        } catch (photoError) {
          console.error('🔍 ADD PATIENT: Error handling photo:', photoError);
          logError('Error handling photo:', photoError);
          // Don't throw here - patient was created successfully
        }
      }

      // Navigate to the new patient's page
      navigate(`/patient/${newPatient.id}`);
      
    } catch (err) {
      console.error('🔍 ADD PATIENT: Error creating patient:', err);
      logError('Error creating patient:', err);
      setError(err instanceof Error ? err.message : 'Failed to create patient');
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
                    Birth sex
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
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 border border-transparent rounded-md shadow-sm"
                >
                  {isLoading ? 'Saving...' : 'Save Person'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}