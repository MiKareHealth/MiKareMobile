import React, { useState } from 'react';
import { Printer, X, Loader } from 'lucide-react';
import { GenerateReport } from './PDFExport';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { 
  Patient, 
  DiaryEntry, 
  Symptom, 
  Medication 
} from '../types/database';

interface ReportMenuProps {
  patient: Patient;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  medications: Medication[];
  mobile?: boolean; // New prop to determine mobile styling
}

type EntriesRange = '3weeks' | '3months' | '1year' | 'custom';

export default function ReportMenu({
  patient,
  diaryEntries,
  symptoms,
  medications,
  mobile = false
}: ReportMenuProps) {
  const { preferences } = useUserPreferences();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | null>(null);
  const [entriesRange, setEntriesRange] = useState<EntriesRange>('3months');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDetailedReport, setShowDetailedReport] = useState(false);
  const [triggerGeneration, setTriggerGeneration] = useState(false);

  const handleReportSelect = (type: 'summary' | 'detailed') => {
    setReportType(type);
    setShowDropdown(false);
    setShowModal(true);
    // Reset to default for detailed reports
    if (type === 'detailed') {
      setEntriesRange('3months');
      setCustomStartDate('');
      setCustomEndDate('');
      setShowDetailedReport(false);
      setTriggerGeneration(false);
    }
  };

  // Calculate date range based on selection (timezone-aware)
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
    <>
      {/* Print Reports Button with Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={mobile 
            ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center py-4 w-full"
            : "group relative w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center"
          }
          title="Print Reports"
        >
          <Printer className="h-6 w-6" />
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowDropdown(false)}
            />
            
            {/* Dropdown Content */}
            <div className={`absolute ${mobile ? 'right-0 top-16' : 'right-0 top-14'} z-20 w-56 bg-background-default rounded-lg shadow-lg border border-border-default py-2 animate-fade-down`}>
              <div className="px-4 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide border-b border-border-subtle">
                Export Reports
              </div>
              
              <div
                onClick={() => handleReportSelect('summary')}
                className="block w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-background-subtle transition-colors duration-200 cursor-pointer"
              >
                Summary Report
              </div>

              <div
                onClick={() => handleReportSelect('detailed')}
                className="block w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-background-subtle transition-colors duration-200 cursor-pointer"
              >
                Detailed Report
              </div>
            </div>
          </>
        )}
      </div>

      {/* Report Generation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-default rounded-xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col animate-fade-down">
            <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">
                {reportType === 'summary' ? 'Summary Report' : 'Detailed Report'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-background-subtle text-text-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {reportType === 'detailed' && !showDetailedReport && (
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
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowDetailedReport(true);
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
              )}

              {reportType === 'detailed' && showDetailedReport && (
                <GenerateReport
                  patient={patient}
                  diaryEntries={getFilteredDiaryEntries()}
                  symptoms={symptoms}
                  medications={medications}
                  type={reportType}
                  onClose={() => {
                    setShowDetailedReport(false);
                    setShowModal(false);
                  }}
                  isCustomRangeValid={true}
                  shouldGenerate={triggerGeneration}
                />
              )}

              {reportType === 'summary' && (
                <GenerateReport
                  patient={patient}
                  diaryEntries={diaryEntries}
                  symptoms={symptoms}
                  medications={medications}
                  type={reportType}
                  onClose={() => setShowModal(false)}
                  isCustomRangeValid={true}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}