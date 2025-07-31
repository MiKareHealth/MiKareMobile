import React, { useState, useEffect } from 'react';
import { X, Brain, Moon, Activity, Smile, AlertCircle, Info, Lock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { getEmoji, getMoodColorClass } from '../utils/moodUtils';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { getCurrentDateInTimezone } from '../utils/timeUtils';
import type { MoodEntry } from '../types/database';
import { theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import { useSubscription } from '../hooks/useSubscription';

interface MoodEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  existingEntry?: MoodEntry | null;
  onSuccess: () => void;
  date?: string; // Optional date parameter, defaults to today
  viewOnly?: boolean;
}

export default function MoodEntryModal({ 
  isOpen, 
  onClose, 
  patientId, 
  existingEntry,
  onSuccess,
  date,
  viewOnly
}: MoodEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState<number | null>(existingEntry?.body || null);
  const [mind, setMind] = useState<number | null>(existingEntry?.mind || null);
  const [sleep, setSleep] = useState<number | null>(existingEntry?.sleep || null);
  const [mood, setMood] = useState<number | null>(existingEntry?.mood || null);
  const [notes, setNotes] = useState(existingEntry?.notes || '');
  const { preferences, formatDate } = useUserPreferences();
  const { isFreePlan } = useSubscription();
  
  // Determine if we're in view-only mode (either by prop or subscription plan)
  const isViewOnly = viewOnly || isFreePlan;
  
  // Initialize entry date with timezone-aware today's date if not provided
  const [entryDate, setEntryDate] = useState(
    existingEntry?.date || 
    date || 
    getCurrentDateInTimezone(preferences.timezone)
  );
  
  // Reset form when the modal opens or gets a new entry
  useEffect(() => {
    if (isOpen) {
      setBody(existingEntry?.body || null);
      setMind(existingEntry?.mind || null);
      setSleep(existingEntry?.sleep || null);
      setMood(existingEntry?.mood || null);
      setNotes(existingEntry?.notes || '');
      
      // Set date based on priority: existingEntry > provided date > today (in user timezone)
      setEntryDate(
        existingEntry?.date || 
        date || 
        getCurrentDateInTimezone(preferences.timezone)
      );
      
      setError(null);
    }
  }, [isOpen, existingEntry, date, preferences.timezone]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if in view-only mode
    if (isViewOnly) return;
    
    if (!body || !mind || !sleep || !mood) {
      setError('Please rate all four categories');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      if (existingEntry) {
        // Update existing entry
        const { error: updateError } = await supabase
          .from('mood_entries')
          .update({
            body,
            mind,
            sleep,
            mood,
            notes: notes || null,
            date: entryDate
          })
          .eq('id', existingEntry.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new entry
        const { error: insertError } = await supabase
          .from('mood_entries')
          .insert([{
            profile_id: patientId,
            date: entryDate,
            body,
            mind,
            sleep,
            mood,
            notes: notes || null
          }]);
          
        if (insertError) {
          // Check if this is a unique constraint error (entry already exists for this day)
          if (insertError.message.includes('unique constraint') || insertError.code === '23505') {
            throw new Error('A mood entry already exists for this date. Please edit the existing entry instead.');
          }
          throw insertError;
        }
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving mood entry:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  
  const renderRatingRow = (
    label: string, 
    value: number | null, 
    onChange: (value: number) => void, 
    icon: React.ReactNode
  ) => (
    <div className="flex items-center bg-gradient-to-r from-white to-teal-50 rounded-lg px-4 py-2">
      <div className="w-32 flex items-center space-x-2">
        {icon}
        <span className="text-sm font-medium text-text-primary">{label}</span>
      </div>
      <div className="flex-1 flex justify-between gap-2">
        {[1, 2, 3, 4, 5].map((val) => (
          <button
            key={val}
            type="button"
            onClick={() => !isViewOnly && onChange(val)}
            disabled={isViewOnly}
            className={`flex-1 aspect-square rounded-full p-1.5 flex items-center justify-center transition-all duration-200 ${
              isViewOnly ? 'cursor-default' : 'cursor-pointer' } ${
              value === val 
                ? 'bg-background-light scale-110 shadow-sm' 
                : 'bg-background-surface hover:bg-background-light'
            }`}
          >
            <span className="text-xl">{getEmoji(val)}</span>
          </button>
        ))}
      </div>
    </div>
  );
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-xl w-full mx-4 animate-fade-down">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-text-primary">
            {isViewOnly 
              ? 'Mood Entry Details' 
              : (existingEntry ? 'Edit Mood Entry' : 'Daily Mood Check-In')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {isViewOnly && isFreePlan && (
          <div className="bg-amber-50 p-3 mx-6 mt-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                Editing mood entries is available on paid plans.
                <a href="/settings" className="ml-1 font-medium underline">Upgrade your plan</a>
              </p>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date Selector */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(e) => !isViewOnly && setEntryDate(e.target.value)}
              max={getCurrentDateInTimezone(preferences.timezone)} 
              disabled={isViewOnly}
              className={`block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
            <p className="mt-1 text-xs text-text-secondary">
              Each patient can have one mood entry per day. Using timezone: {preferences.timezone}
            </p>
          </div>
          
          {/* Rating Scale Guide */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-start space-x-2 mb-2">
            <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Rate how you felt today from 1 (poor) to 5 (excellent) in each category
            </p>
          </div>
          
          {/* Rating Scale Labels */}
          <div className="flex justify-between px-36 text-xs text-text-secondary">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
          
          {/* Rating Categories */}
          <div className="space-y-3">
            {renderRatingRow(
              "Physical Wellbeing", 
              body, 
              setBody, 
              <Activity className="h-5 w-5 text-teal-600" />
            )}
            
            {renderRatingRow(
              "Mental Wellbeing", 
              mind, 
              setMind, 
              <Brain className="h-5 w-5 text-teal-600" />
            )}
            
            {renderRatingRow(
              "Sleep Quality", 
              sleep, 
              setSleep, 
              <Moon className="h-5 w-5 text-teal-600" />
            )}
            
            {renderRatingRow(
              "Overall Mood", 
              mood, 
              setMood, 
              <Smile className="h-5 w-5 text-teal-600" />
            )}
          </div>
          
          {/* Notes Field */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => !isViewOnly && setNotes(e.target.value)}
              disabled={isViewOnly}
              rows={3}
              placeholder="Any additional thoughts or observations about your day..."
              className={`block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>
          
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-primary bg-background-default border border-border-default rounded-md shadow-sm hover:bg-background-subtle"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading || !body || !mind || !sleep || !mood}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 border border-transparent rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Mood Entry'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}