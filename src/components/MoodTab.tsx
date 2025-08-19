import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smile, Calendar, Plus, Brain, Activity, Moon, ArrowUpDown, ChevronDown } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import MoodEntryModal from './MoodEntryModal';
import type { MoodEntry } from '../types/database';
import { tokens } from '../styles/tokens';
import { getEmoji } from '../utils/moodUtils';
import { getCurrentDateInTimezone, isToday } from '../utils/timeUtils';
import SubscriptionFeatureBlock from './SubscriptionFeatureBlock';
import { error as logError } from '../utils/logger';

interface MoodTabProps {
  patientId: string;
  initialEntries?: MoodEntry[];
  onEntryEdit?: (entry: MoodEntry) => void;
  isFreePlan?: boolean;
}

export default function MoodTab({ patientId, initialEntries, onEntryEdit, isFreePlan = false }: MoodTabProps) {
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>(initialEntries || []);
  const [loading, setLoading] = useState(initialEntries ? false : true);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<MoodEntry | null>(null);
  const [sortAscending, setSortAscending] = useState(false);
  const { formatDate, preferences } = useUserPreferences();
  
  useEffect(() => {
    if (!initialEntries) {
      fetchMoodEntries();
    }
  }, [patientId, initialEntries]);
  
  useEffect(() => {
    // Update local state when prop changes
    if (initialEntries) {
      setMoodEntries(initialEntries);
    }
  }, [initialEntries]);
  
  const fetchMoodEntries = async () => {
    try {
      setLoading(true);
      const supabase = await getSupabaseClient();
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('profile_id', patientId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setMoodEntries(data || []);
    } catch (err) {
      logError('Error fetching mood entries:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddMoodEntry = () => {
    if (isFreePlan) return;
    setSelectedEntry(null);
    setShowMoodModal(true);
  };
  
  const handleEditMoodEntry = (entry: MoodEntry) => {
    setSelectedEntry(entry);
    setShowMoodModal(true);
    if (onEntryEdit) {
      onEntryEdit(entry);
    }
  };
  
  // Check if there's a mood entry for today using the timezone-aware isToday function
  const hasTodaysMoodEntry = moodEntries.some(entry => 
    isToday(entry.date, preferences.timezone)
  );

  // Sort entries based on the current sort direction
  const sortedEntries = [...moodEntries].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    
    // First sort by date
    if (dateA !== dateB) {
      return sortAscending ? dateA - dateB : dateB - dateA;
    }
    
    // If dates are equal, sort by created_at timestamp
    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return sortAscending ? createdA - createdB : createdB - createdA;
  });
  
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Add button and Sort option */}
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <button
          onClick={() => setSortAscending(!sortAscending)}
          className="inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-white text-xs sm:text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
        >
          <ArrowUpDown className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 text-gray-500" />
          <span>Sort {sortAscending ? 'Newest First' : 'Oldest First'}</span>
        </button>
        
        <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Mood tracking">
          <button
            onClick={handleAddMoodEntry}
            disabled={hasTodaysMoodEntry || isFreePlan}
            className={`group relative inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 ${
              hasTodaysMoodEntry
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white'
            } text-xs sm:text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Smile className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${hasTodaysMoodEntry ? 'text-gray-400' : 'text-white/90 group-hover:text-white transition-colors'}`} />
            <span>{hasTodaysMoodEntry ? 'Today\'s Entry Logged' : 'Add Mood Entry'}</span>
          </button>
        </SubscriptionFeatureBlock>
      </div>

      {/* Column Headers - Mobile-friendly */}
      <div className="hidden sm:grid sm:grid-cols-[120px_1fr] sm:gap-6">
        <div className="text-sm font-medium text-gray-500">Date</div>
        <div className="grid grid-cols-4 gap-6">
          <div className="flex flex-col items-center">
            <Activity className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium mt-1">Body</span>
          </div>
          <div className="flex flex-col items-center">
            <Brain className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium mt-1">Mind</span>
          </div>
          <div className="flex flex-col items-center">
            <Moon className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium mt-1">Sleep</span>
          </div>
          <div className="flex flex-col items-center">
            <Smile className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium mt-1">Mood</span>
          </div>
        </div>
      </div>

      {/* Mood History List */}
      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          // Loading skeleton
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="animate-pulse grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-2 sm:gap-6 p-3 sm:p-4 rounded-lg bg-white shadow-sm">
              <div className="flex-shrink-0">
                <div className="w-24 h-5 bg-gray-200 rounded"></div>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-6 mt-2 sm:mt-0">
                <div className="flex justify-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="flex justify-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="flex justify-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
                <div className="flex justify-center">
                  <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                </div>
              </div>
            </div>
          ))
        ) : sortedEntries.length > 0 ? (
          // Mobile-friendly mood entries list
          sortedEntries.map(entry => (
            <div
              key={entry.id}
              onClick={() => handleEditMoodEntry(entry)}
              className={`p-3 sm:p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 ${isFreePlan ? 'cursor-default' : 'cursor-pointer'}`}
            >
              {/* Mobile view */}
              <div className="block sm:hidden">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium text-teal-900">
                    {formatDate(entry.date)}
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-xl">{getEmoji(entry.mood)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3 bg-white/30 rounded-lg p-2">
                  <div className="flex flex-col items-center">
                    <Activity className="h-3 w-3 text-gray-500 mb-1" />
                    <span className="text-lg">{getEmoji(entry.body)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Brain className="h-3 w-3 text-gray-500 mb-1" />
                    <span className="text-lg">{getEmoji(entry.mind)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Moon className="h-3 w-3 text-gray-500 mb-1" />
                    <span className="text-lg">{getEmoji(entry.sleep)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <Smile className="h-3 w-3 text-gray-500 mb-1" />
                    <span className="text-lg">{getEmoji(entry.mood)}</span>
                  </div>
                </div>
                
                {entry.notes && (
                  <div className="mt-2 text-sm text-gray-600 bg-white/50 p-2 rounded line-clamp-2">
                    {entry.notes}
                  </div>
                )}
              </div>
              
              {/* Desktop view */}
              <div className="hidden sm:grid sm:grid-cols-[120px_1fr] sm:gap-6">
                <div className="text-sm font-medium text-teal-900 flex items-center">
                  {formatDate(entry.date)}
                </div>
                <div className="grid grid-cols-4 gap-6">
                  <div className="flex justify-center">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xl">{getEmoji(entry.body)}</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xl">{getEmoji(entry.mind)}</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xl">{getEmoji(entry.sleep)}</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <span className="text-xl">{getEmoji(entry.mood)}</span>
                    </div>
                  </div>
                </div>
                
                {entry.notes && (
                  <div className="col-span-full mt-2 text-sm text-gray-600 bg-white/50 p-2 rounded">
                    {entry.notes}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          // Empty state
          <div className="text-center py-16">
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Smile className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className={tokens.typography.sizes.h3}>No mood entries yet</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
              Track daily mood, body, mind, and sleep to monitor wellbeing over time.
            </p>
            <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Mood tracking">
              <button
                onClick={handleAddMoodEntry}
                className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
              >
                Add First Mood Entry
              </button>
            </SubscriptionFeatureBlock>
          </div>
        )}
      </div>
      
      {/* Mood Entry Modal */}
      <MoodEntryModal
        isOpen={showMoodModal}
        onClose={() => {
          setShowMoodModal(false);
          setSelectedEntry(null);
        }}
        patientId={patientId}
        existingEntry={selectedEntry}
        viewOnly={isFreePlan && selectedEntry !== null}
        onSuccess={() => {
          fetchMoodEntries();
        }}
      />
    </div>
  );
}