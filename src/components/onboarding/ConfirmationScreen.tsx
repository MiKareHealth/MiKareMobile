import React, { useState, useEffect } from 'react';
import { useOnboarding } from '../../contexts/OnboardingContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ONBOARDING_MEDIA_IMAGE } from '../../config/branding';

interface ConfirmationScreenProps {
  onComplete: () => void;
  onBack: () => void;
}

export default function ConfirmationScreen({ onComplete, onBack }: ConfirmationScreenProps) {
  const { state } = useOnboarding();
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  
  // Get browser's timezone name
  const getTimezoneName = (timezone: string): string => {
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
    
    const found = timezoneOptions.find(option => option.value === timezone);
    return found ? found.label : timezone;
  };
  
  // Get session timeout label
  const getSessionTimeoutLabel = (timeout: number): string => {
    switch(timeout) {
      case 30: return '30 minutes';
      case 60: return '1 hour';
      case 120: return '2 hours';
      case 240: return '4 hours';
      default: return `${timeout} minutes`;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 animate-fade-down">
      <h2 className="text-3xl font-semibold font-heading text-heading-h2 mb-6 text-center">
        Confirm Your Details
      </h2>
      
      <div className="bg-white shadow-sm rounded-xl p-6 space-y-6 mb-8">
        {/* Welcome Video/Image */}
        <div className="relative bg-white rounded-lg shadow-sm overflow-hidden">
          <img 
            src={ONBOARDING_MEDIA_IMAGE}
            alt="Onboarding"
            className="w-full aspect-video object-cover object-center rounded-lg"
          />
        </div>
        
        <div className="space-y-6">
          {/* Account Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle2 className="h-5 w-5 text-teal-600 mr-2" />
              Account Information
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium text-gray-900">{state.account.fullName || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium text-gray-900">{state.account.email || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* People Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle2 className="h-5 w-5 text-teal-600 mr-2" />
              People You'll Care For
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              {state.profiles.map((profile, index) => (
                <div key={index} className="border-b border-gray-200 pb-3 last:border-0 last:pb-0">
                  <p className="font-medium text-gray-900">{profile.fullName || `Person ${index + 1}`}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                    <div>
                      <p className="text-sm text-gray-500">Relationship</p>
                      <p className="text-sm text-gray-900">{profile.relationship || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="text-sm text-gray-900">{profile.dob || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="text-sm text-gray-900">{profile.gender}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settings Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle2 className="h-5 w-5 text-teal-600 mr-2" />
              Your Preferences
            </h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Timezone</p>
                  <p className="font-medium text-gray-900">
                    {getTimezoneName(state.settings.timezone)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time Format</p>
                  <p className="font-medium text-gray-900">
                    {state.settings.timeFormat === '12h' ? '12-hour (AM/PM)' : '24-hour'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Session Timeout</p>
                  <p className="font-medium text-gray-900">
                    {getSessionTimeoutLabel(state.settings.sessionTimeout)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {state.error && (
          <div className="rounded-md bg-red-50 p-4 border border-red-200 mt-6">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{state.error}</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
            className="px-6 py-3 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onComplete}
            disabled={state.submitting}
            className="px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {state.submitting ? 'Creating Account...' : 'Finish Setup'}
          </button>
        </div>
      </div>
    </div>
  );
}