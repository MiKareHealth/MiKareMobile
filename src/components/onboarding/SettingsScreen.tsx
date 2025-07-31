import React, { useState, useEffect } from 'react';
import { Clock, Globe } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface SettingsScreenProps {
  onNext: () => void;
  onBack: () => void;
}

export default function SettingsScreen({ onNext, onBack }: SettingsScreenProps) {
  const { state, updateSettings } = useOnboarding();
  const { timezone, timeFormat, sessionTimeout } = state.settings;
  
  const [formData, setFormData] = useState({
    timezone: timezone || 'UTC',
    timeFormat: timeFormat || '12h',
    sessionTimeout: sessionTimeout || 30
  });
  
  const [initialized, setInitialized] = useState(false);

  // Initialize from sessionStorage if available
  useEffect(() => {
    if (!initialized) {
      try {
        const savedSettings = sessionStorage.getItem('mikare_onboarding_settings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          
          // Initialize with saved settings
          if (parsedSettings) {
            setFormData({
              timezone: parsedSettings.timezone || timezone,
              timeFormat: parsedSettings.timeFormat || timeFormat,
              sessionTimeout: parsedSettings.sessionTimeout || sessionTimeout
            });
            
            // Update context
            updateSettings({
              timezone: parsedSettings.timezone,
              timeFormat: parsedSettings.timeFormat,
              sessionTimeout: parsedSettings.sessionTimeout
            });
          }
        }
      } catch (err) {
        console.error('Failed to load settings from sessionStorage:', err);
      }
      setInitialized(true);
    }
  }, [initialized, timezone, timeFormat, sessionTimeout, updateSettings]);

  // Save settings to sessionStorage when they change
  useEffect(() => {
    if (initialized) {
      try {
        sessionStorage.setItem('mikare_onboarding_settings', JSON.stringify(formData));
      } catch (err) {
        console.error('Failed to save settings to sessionStorage:', err);
      }
    }
  }, [formData, initialized]);
  
  // Timezone options
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
  
  // Session timeout options
  const sessionTimeoutOptions = [
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 240, label: '4 hours' }
  ];

  // Handler for form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Update context
    updateSettings({
      timezone: formData.timezone,
      timeFormat: formData.timeFormat as '12h' | '24h',
      sessionTimeout: formData.sessionTimeout
    });
    
    // Save to sessionStorage
    try {
      sessionStorage.setItem('mikare_onboarding_settings', JSON.stringify(formData));
    } catch (err) {
      console.error('Failed to save settings to sessionStorage:', err);
    }
    
    // Proceed to next step
    onNext();
  };

  // Handler for timezone selection
  const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      timezone: e.target.value
    }));
  };

  // Handler for time format selection
  const handleTimeFormatChange = (format: '12h' | '24h') => {
    setFormData(prev => ({
      ...prev,
      timeFormat: format
    }));
  };

  // Handler for session timeout selection
  const handleSessionTimeoutChange = (timeout: number) => {
    setFormData(prev => ({
      ...prev,
      sessionTimeout: timeout
    }));
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 animate-fade-down">
      <h2 className="text-3xl font-semibold font-heading text-heading-h2 mb-6 text-center">
        Your Preferences
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div>
            <label htmlFor="timezone" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Globe className="h-5 w-5 mr-2 text-teal-600" />
              Your Timezone
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={handleTimezoneChange}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 py-2 px-3"
            >
              {timezoneOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This will be used to correctly display dates and times in your health records.
            </p>
          </div>

          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Clock className="h-5 w-5 mr-2 text-teal-600" />
              Time Format
            </label>
            <div className="mt-2 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTimeFormatChange('12h')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex justify-center items-center ${
                  formData.timeFormat === '12h' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Clock className="h-4 w-4 mr-2" />
                12-hour (AM/PM)
              </button>
              
              <button
                type="button"
                onClick={() => handleTimeFormatChange('24h')}
                className={`px-4 py-2 text-sm font-medium rounded-md flex justify-center items-center ${
                  formData.timeFormat === '24h' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Clock className="h-4 w-4 mr-2" />
                24-hour
              </button>
            </div>
          </div>
          
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Clock className="h-5 w-5 mr-2 text-teal-600" />
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
                  onClick={() => handleSessionTimeoutChange(option.value)}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    formData.sessionTimeout === option.value
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
        </div>
        
        <div className="flex justify-between pt-4">
          <button
            type="button"
            onClick={onBack}
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