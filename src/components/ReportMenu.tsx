import React, { useState } from 'react';
import { Printer, X, Loader } from 'lucide-react';
import { GenerateReport } from './PDFExport';
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

export default function ReportMenu({
  patient,
  diaryEntries,
  symptoms,
  medications,
  mobile = false
}: ReportMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'detailed' | null>(null);

  const handleReportSelect = (type: 'summary' | 'detailed') => {
    setReportType(type);
    setShowDropdown(false);
    setShowModal(true);
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

            <div className="flex-1 overflow-y-auto">
              {reportType && (
                <GenerateReport
                  patient={patient}
                  diaryEntries={diaryEntries}
                  symptoms={symptoms}
                  medications={medications}
                  type={reportType}
                  onClose={() => setShowModal(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}