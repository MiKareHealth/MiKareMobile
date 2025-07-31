import React, { useState, useEffect } from 'react';
import { Plus, Trash, AlertCircle } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface PeopleDetailsProps {
  onNext: () => void;
  onBack: () => void;
}

export default function PeopleDetails({ onNext, onBack }: PeopleDetailsProps) {
  const { state, updateProfile, addProfile, removeProfile } = useOnboarding();
  const { profiles } = state;
  
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [initialized, setInitialized] = useState(false);

  // Load profiles from sessionStorage on mount
  useEffect(() => {
    if (!initialized) {
      try {
        const savedProfiles = sessionStorage.getItem('mikare_onboarding_profiles');
        if (savedProfiles) {
          const parsedProfiles = JSON.parse(savedProfiles);
          
          // Only load if we found profiles in storage
          if (parsedProfiles.length > 0) {
            // For each saved profile, ensure we have enough slots
            while (parsedProfiles.length > state.profiles.length) {
              addProfile();
            }
            
            // Update each profile
            parsedProfiles.forEach((profile: any, index: number) => {
              if (index < state.profiles.length) {
                updateProfile(index, profile);
              }
            });
          }
        }
      } catch (err) {
        console.error('Failed to load profiles from sessionStorage:', err);
      }
      
      // Mark as initialized to prevent reloading
      setInitialized(true);
    }
  }, [initialized, state.profiles, addProfile, updateProfile]);

  // Save profiles to sessionStorage whenever they change
  useEffect(() => {
    if (initialized) {
      try {
        sessionStorage.setItem('mikare_onboarding_profiles', JSON.stringify(profiles));
      } catch (err) {
        console.error('Failed to save profiles to sessionStorage:', err);
      }
    }
  }, [profiles, initialized]);

  // Validate form with less strict requirements
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    
    // Check each person's date of birth is not in the future if provided
    profiles.forEach((person, index) => {
      if (person.dob) {
        // Validate date is not in the future
        const dobDate = new Date(person.dob);
        const today = new Date();
        if (dobDate > today) {
          newErrors[`person_${index}_dob`] = 'Date cannot be in the future';
        }
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Store data in sessionStorage before proceeding
      try {
        sessionStorage.setItem('mikare_onboarding_profiles', JSON.stringify(profiles));
      } catch (err) {
        console.error('Failed to save profiles to sessionStorage:', err);
      }
      onNext();
    }
  };

  const handleInputChange = (index: number, field: string, value: string) => {
    updateProfile(index, { [field]: value } as any);
    
    // Clear error when user types
    const errorKey = `person_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[errorKey];
        return updated;
      });
    }
  };

  const handleAddProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    addProfile();
  };

  const handleRemoveProfile = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    removeProfile(index);
  };

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Save current state before going back
    try {
      sessionStorage.setItem('mikare_onboarding_profiles', JSON.stringify(profiles));
    } catch (err) {
      console.error('Failed to save profiles before going back:', err);
    }
    
    onBack();
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 animate-fade-down">
      <h2 className="text-3xl font-semibold font-heading text-heading-h2 mb-6 text-center">
        Add People You'll Care For
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        {profiles.map((person, index) => (
          <div 
            key={index} 
            className="p-5 border border-gray-200 rounded-lg bg-gray-50 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                Person {index + 1}
              </h3>
              {profiles.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveProfile(index, e)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash className="h-5 w-5" />
                </button>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={person.fullName}
                onChange={(e) => handleInputChange(index, 'fullName', e.target.value)}
                className="block w-full rounded-md border border-gray-300 focus:border-teal-500 focus:ring-teal-500 px-4 py-2 text-base"
                placeholder="Enter person's name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship
              </label>
              <input
                type="text"
                value={person.relationship}
                onChange={(e) => handleInputChange(index, 'relationship', e.target.value)}
                className="block w-full rounded-md border border-gray-300 focus:border-teal-500 focus:ring-teal-500 px-4 py-2 text-base"
                placeholder="e.g., Child, Parent, Self"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={person.dob}
                  onChange={(e) => handleInputChange(index, 'dob', e.target.value)}
                  className={`block w-full rounded-md border ${
                    errors[`person_${index}_dob`] 
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:border-teal-500 focus:ring-teal-500'
                  } px-4 py-2 text-base`}
                />
                {errors[`person_${index}_dob`] && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {errors[`person_${index}_dob`]}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender
                </label>
                <select
                  value={person.gender}
                  onChange={(e) => handleInputChange(index, 'gender', e.target.value as 'Male' | 'Female' | 'Other')}
                  className="block w-full rounded-md border border-gray-300 focus:border-teal-500 focus:ring-teal-500 px-4 py-2 text-base"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        
        <button
          type="button"
          onClick={handleAddProfile}
          className="w-full py-3 px-4 flex justify-center items-center border border-dashed border-teal-300 rounded-lg hover:bg-teal-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
        >
          <Plus className="h-5 w-5 text-teal-500 mr-2" />
          <span className="text-teal-600 font-medium">Add Another Person</span>
        </button>
        
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={handleBack}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Back
          </button>
          <button
            type="submit"
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Next
          </button>
        </div>
      </form>
    </div>
  );
}