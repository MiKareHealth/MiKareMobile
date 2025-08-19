import React, { useState } from 'react';
import { X } from 'lucide-react';
import { GenerateReport } from './PDFExport';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { 
  Patient, 
  DiaryEntry, 
  Symptom, 
  Medication,
  MoodEntry
} from '../types/database';

type EntriesRange = '3weeks' | '3months' | '1year' | 'custom';

interface DetailedReportModalProps {
  patient: Patient;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  medications: Medication[];
  moodEntries: MoodEntry[];
  onClose: () => void;
}

export default function DetailedReportModal({
  patient,
  diaryEntries,
  symptoms,
  medications,
  moodEntries,
  onClose
}: DetailedReportModalProps) {
  const { preferences } = useUserPreferences();
  const [entriesRange, setEntriesRange] = useState<EntriesRange>('3months');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showReport, setShowReport] = useState(false);
  const [triggerGeneration, setTriggerGeneration] = useState(false);

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999); // End of day

    let startDate = new Date(now);
    
    switch (entriesRange) {
      case '3weeks':
        startDate.setDate(now.getDate() - 21);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '1year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (customStartDate && customEndDate) {
          return {
            startDate: new Date(customStartDate + 'T00:00:00'),
            endDate: new Date(customEndDate + 'T23:59:59')
          };
        }
        return null;
    }
    
    startDate.setHours(0, 0, 0, 0); // Start of day
    return { startDate, endDate };
  };

  // Validate custom date range
  const isCustomRangeValid = () => {
    if (entriesRange !== 'custom') return true;
    if (!customStartDate || !customEndDate) return false;
    return new Date(customStartDate) <= new Date(customEndDate);
  };

  // Filter diary entries based on selected range and exclude AI entries
  const getFilteredDiaryEntries = () => {
    const dateRange = getDateRange();
    if (!dateRange) return diaryEntries.filter(entry => entry.entry_type !== 'AI');

    return diaryEntries.filter(entry => {
      // Exclude AI entries
      if (entry.entry_type === 'AI') return false;
      
      // Filter by date range
      const entryDate = new Date(entry.date);
      return entryDate >= dateRange.startDate && entryDate <= dateRange.endDate;
    });
  };

  return (
    <div className="p-4">
      {!showReport ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entries to include
            </label>
            <select
              value={entriesRange}
              onChange={(e) => setEntriesRange(e.target.value as EntriesRange)}
              className="w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200"
            >
              <option value="3weeks">Last 3 weeks</option>
              <option value="3months">Last 3 months</option>
              <option value="1year">Last year</option>
              <option value="custom">Select date range</option>
            </select>
          </div>

          {entriesRange === 'custom' && (
            <div className="space-y-3">
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    id="custom-start-date"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!customStartDate ? 'text-transparent' : 'text-gray-900'}`}
                    max={customEndDate || undefined}
                  />
                  {!customStartDate && (
                    <div 
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => (document.getElementById('custom-start-date') as HTMLInputElement)?.showPicker()}
                    >
                      <span className="text-sm font-medium text-gray-500">Start date</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    id="custom-end-date"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!customEndDate ? 'text-transparent' : 'text-gray-900'}`}
                    min={customStartDate || undefined}
                  />
                  {!customEndDate && (
                    <div 
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => (document.getElementById('custom-end-date') as HTMLInputElement)?.showPicker()}
                    >
                      <span className="text-sm font-medium text-gray-500">End date</span>
                    </div>
                  )}
                </div>
              </div>
              
              {!isCustomRangeValid() && (
                <p className="text-sm text-red-600">
                  {!customStartDate || !customEndDate 
                    ? 'Both start and end dates are required.'
                    : 'Start date must be on or before end date.'
                  }
                </p>
              )}
            </div>
          )}

          <div className="text-sm text-gray-600">
            {(() => {
              const filteredEntries = getFilteredDiaryEntries();
              const dateRange = getDateRange();
              if (dateRange) {
                return `Will include ${filteredEntries.length} non-AI diary entries from ${dateRange.startDate.toLocaleDateString()} to ${dateRange.endDate.toLocaleDateString()}.`;
              }
              return `Will include ${filteredEntries.length} non-AI diary entries.`;
            })()}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            
            <button
              onClick={() => {
                setShowReport(true);
                setTriggerGeneration(true);
              }}
              disabled={!isCustomRangeValid()}
              className={`px-4 py-2 rounded-md ${
                isCustomRangeValid() 
                  ? 'bg-teal-600 text-white hover:bg-teal-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Generate Report
            </button>
          </div>
        </div>
      ) : (
        <GenerateReport
          patient={patient}
          diaryEntries={getFilteredDiaryEntries()}
          symptoms={symptoms}
          medications={medications}
          moodEntries={moodEntries}
          type="detailed"
          onClose={onClose}
          isCustomRangeValid={true}
          shouldGenerate={triggerGeneration}
        />
      )}
    </div>
  );
}
