import React, { useState, useEffect } from 'react';
import { Smile, FileText, Activity, Brain, Moon, Calendar, AlertCircle, Pill } from 'lucide-react';
import type { MoodEntry, Medication, DiaryEntry } from '../types/database';
import { getEmoji } from '../utils/moodUtils';
import { isToday } from '../utils/timeUtils';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { theme } from '../styles/tokens';
import SubscriptionFeatureBlock from './SubscriptionFeatureBlock';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';

interface HealthAnalyticsCardsProps {
  patientId: string;
  moodEntries: MoodEntry[];
  medications: Medication[];
  diaryEntries: DiaryEntry[];
  onAddMood?: () => void;
}

export default function HealthAnalyticsCards({ 
  patientId,
  moodEntries,
  medications,
  diaryEntries,
  onAddMood
}: HealthAnalyticsCardsProps) {
  const { preferences } = useUserPreferences();
  const [isFreePlan, setIsFreePlan] = useState(true);
  
  // Get today's mood entry if it exists
  const todaysMood = moodEntries.find(entry => isToday(entry.date, preferences.timezone));
  
  // Count active medications
  const activeMedications = medications.filter(med => med.status === 'Active');
  
  // Count appointments (diary entries with type "Appointment")
  const appointmentsCount = diaryEntries.filter(entry => entry.entry_type === 'Appointment').length;

  // Check subscription plan
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const supabase = await getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        const { data, error } = await supabase
          .from('profiles')
          .select('subscription_plan, subscription_status')
          .eq('id', user.id)
          .single();
        
        if (error) {
          logError('Error fetching subscription status:', error);
          return;
        }
        
        const isFreePlan = 
          data.subscription_plan === 'MiKare Health - free plan' || 
          !data.subscription_plan || 
          data.subscription_status !== 'active';
        
        setIsFreePlan(isFreePlan);
      } catch (error) {
        logError('Error checking subscription:', error);
      }
    };
    
    checkSubscription();
  }, []);

  return (
    <div className="p-4 bg-gradient-to-br from-primary to-secondary rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mood Overview Card */}
        <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Mood tracking">
          <div className="bg-gradient-to-br from-amber-50 to-amber-50/80 rounded-lg p-4 shadow-lg">
            <div className="flex items-center text-amber-800 mb-3">
              <Smile className="h-5 w-5 text-amber-600 mr-2" />
              <h3 className="text-sm font-medium">Mood Overview</h3>
            </div>
            
            <h4 className="text-sm font-medium text-gray-700 mb-2">Today's Mood</h4>
            
            {todaysMood ? (
              <div className="flex flex-col items-center mb-4">
                <span className="text-4xl mb-3">{getEmoji(todaysMood.mood)}</span>
                
                <div className="grid grid-cols-4 gap-2 w-full mt-2">
                  <div className="flex flex-col items-center">
                    <Activity className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-600 mt-1">Body</span>
                    <span className="text-xl">{getEmoji(todaysMood.body)}</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <Brain className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-600 mt-1">Mind</span>
                    <span className="text-xl">{getEmoji(todaysMood.mind)}</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <Moon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-600 mt-1">Sleep</span>
                    <span className="text-xl">{getEmoji(todaysMood.sleep)}</span>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <Smile className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-600 mt-1">Mood</span>
                    <span className="text-xl">{getEmoji(todaysMood.mood)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24">
                {onAddMood ? (
                  <>
                    <span className="text-2xl mb-2">😊</span>
                    <button
                      onClick={onAddMood}
                      className="text-sm text-amber-800 hover:underline"
                    >
                      Click to log today's mood
                    </button>
                  </>
                ) : (
                  <span className="text-sm text-gray-500">
                    Click to log today's mood
                  </span>
                )}
              </div>
            )}
          </div>
        </SubscriptionFeatureBlock>
        
        {/* Symptom Trends Card */}
        <div className="bg-gradient-to-br from-red-50 to-red-50/80 rounded-lg p-4 shadow-lg">
          <div className="flex items-center text-red-800 mb-3">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <h3 className="text-sm font-medium">Symptom Trends</h3>
          </div>
          
          <div className="flex items-center justify-center h-24 text-center text-sm text-gray-500">
            Symptom tracking visualization coming soon
          </div>
        </div>
        
        {/* Medication Adherence Card */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-50/80 rounded-lg p-4 shadow-lg">
          <div className="flex items-center text-emerald-800 mb-3">
            <Pill className="h-5 w-5 text-emerald-600 mr-2" />
            <h3 className="text-sm font-medium">Medications</h3>
          </div>
          
          <div className="h-24 overflow-auto">
            {activeMedications.length > 0 ? (
              <div className="space-y-2">
                {activeMedications.slice(0, 3).map((med) => (
                  <div key={med.id} className="bg-white/60 rounded px-2 py-1 text-sm">
                    <div className="font-medium">{med.medication_name}</div>
                    <div className="text-xs text-gray-600">{med.dosage}</div>
                  </div>
                ))}
                {activeMedications.length > 3 && (
                  <div className="text-xs text-emerald-700 text-center">
                    +{activeMedications.length - 3} more medications
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center text-sm text-gray-500">
                <span>No medications to track</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Appointment Stats Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-50/80 rounded-lg p-4 shadow-lg">
          <div className="flex items-center text-blue-800 mb-3">
            <Calendar className="h-5 w-5 text-blue-600 mr-2" />
            <h3 className="text-sm font-medium">Appointment Stats</h3>
          </div>
          
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <span className="text-4xl font-bold text-blue-600">{appointmentsCount}</span>
            <span className="text-sm text-gray-500">appointments recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
}