import React, { useState, useEffect } from 'react';
import { Camera, X, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';
import type { Patient } from '../types/database';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess: () => void;
}

export default function EditPatientModal({
  isOpen,
  onClose,
  patient,
  onSuccess
}: EditPatientModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Reset form when modal opens/closes or patient changes
  useEffect(() => {
    if (isOpen && patient) {
      setPhotoPreview(patient.photo_url);
      setPhotoFile(null);
      setError(null);
    }
  }, [isOpen, patient]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Selected file must be an image');
        return;
      }
      
      setPhotoFile(file);
      setError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!patient) return;
    
    setLoading(true);
    setError(null);

    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("User not authenticated.");
        setLoading(false);
        return;
      }

      // Get form data more safely with error handling
      let form = e.currentTarget;
      if (!form || !(form instanceof HTMLFormElement)) {
        // Fallback: try to get form by ID
        const formById = document.getElementById('edit-patient-form') as HTMLFormElement;
        if (!formById) {
          throw new Error('Form element not found');
        }
        form = formById;
      }
      
      const formData = new FormData(form);
      
      // Update patient data
      const patientData: Partial<Patient> = {
        full_name: formData.get('full_name') as string,
        dob: formData.get('dob') as string,
        gender: formData.get('gender') as 'Male' | 'Female' | 'Other',
        relationship: formData.get('relationship') as string,
        country: formData.get('country') as string,
        address: formData.get('address') as string,
        phone_number: formData.get('phone_number') as string,
        notes: formData.get('notes') as string,
      };

      // Update patient record
      const { error: updateError } = await supabase
        .from('patients')
        .update(patientData)
        .eq('id', patient.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Handle photo upload if new photo was selected
      if (photoFile) {
        const fileName = `${user.id}/${photoFile.name}`;
        
        // Upload to Supabase storage
        const { error: uploadError } = await supabase.storage
          .from('user-photos')
          .upload(fileName, photoFile, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('user-photos')
          .getPublicUrl(fileName);
          
        // Update patient record with new photo URL
        const { error: photoUpdateError } = await supabase
          .from('patients')
          .update({ photo_url: publicUrl })
          .eq('id', patient.id);
          
        if (photoUpdateError) throw photoUpdateError;
      }

      onSuccess();
      onClose();
      
    } catch (err) {
      logError('Error updating patient:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-down">
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
                      alt="Patient"
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
                <h2 className="text-2xl font-bold text-gray-900">Edit Patient Information</h2>
                <p className="text-gray-500">Update patient details below</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Patient Form */}
        <div className="p-6">
          <form id="edit-patient-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Photo upload modal */}
            {showPhotoModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 animate-fade-down">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Update Photo</h2>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(false)}
                      className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">Choose a new photo for this patient.</p>
                  
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
                    defaultValue={patient.full_name}
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
                    defaultValue={patient.dob}
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
                    defaultValue={patient.gender}
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
                    defaultValue={patient.relationship}
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
                    defaultValue={patient.country}
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
                    defaultValue={patient.phone_number || ''}
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
                    defaultValue={patient.address || ''}
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
                    rows={4}
                    defaultValue={patient.notes || ''}
                    placeholder="Add important patient information such as family history, allergies, cultural background, religious preferences, nationality, or any other relevant details that healthcare providers should know..."
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
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 border border-transparent rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 