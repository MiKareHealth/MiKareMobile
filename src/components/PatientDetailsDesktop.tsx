import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Calendar, 
  Stethoscope, 
  Pill, 
  BookOpen, 
  Brain, 
  FileText, 
  ArrowUpDown,
  Plus,
  ChevronDown,
  ChevronUp,
  Camera,
  X,
  AlertCircle,
  Printer,
  Edit
} from 'lucide-react';
import { MdOutlineSick } from 'react-icons/md';
import Layout from './Layout';
import MedicationList from './MedicationList';
import MoodTab from './MoodTab';
import AIAnalysisButtons from './AIAnalysisButtons';
import ReportMenu from './ReportMenu';
import EditPatientModal from './EditPatientModal';
import { GenerateReport } from './PDFExport';
import DetailedReportModal from './DetailedReportModal';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { tokens, theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import type { Patient, DiaryEntry, Symptom, PatientDocument, Medication, MoodEntry } from '../types/database';
import { TabType } from '../pages/PatientDetails';
import { getSupabaseClient } from '../lib/supabaseClient';
import SubscriptionFeatureBlock from './SubscriptionFeatureBlock';
import { useSubscription } from '../hooks/useSubscription';
import Skeleton from './Skeleton';

interface PatientDetailsDesktopProps {
  patient: Patient | null;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  documents: PatientDocument[];
  medications: Medication[];
  moodEntries: MoodEntry[];
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  sortAscending: boolean;
  setSortAscending: (sort: boolean) => void;
  showPatientInfo: boolean;
  setShowPatientInfo: (show: boolean) => void;
  dateRangeStart: string;
  setDateRangeStart: (date: string) => void;
  dateRangeEnd: string;
  setDateRangeEnd: (date: string) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onAddDiaryEntry: () => void;
  onEditDiaryEntry: (entry: DiaryEntry) => void;
  onAddSymptom: () => void;
  onEditSymptom: (symptom: Symptom) => void;
  onAddNote: () => void;
  onEditNote: (entry: DiaryEntry) => void;
  onAddDocument: () => void;
  onEditDocument: (doc: PatientDocument) => void;
  onRefresh: () => void;
  error: string | null;
  loading?: boolean;
}

export default function PatientDetailsDesktop({
  patient,
  diaryEntries,
  symptoms,
  documents,
  medications,
  moodEntries,
  activeTab,
  setActiveTab,
  sortAscending,
  setSortAscending,
  showPatientInfo,
  setShowPatientInfo,
  dateRangeStart,
  setDateRangeStart,
  dateRangeEnd,
  setDateRangeEnd,
  searchTerm,
  setSearchTerm,
  onAddDiaryEntry,
  onEditDiaryEntry,
  onAddSymptom,
  onEditSymptom,
  onAddNote,
  onEditNote,
  onAddDocument,
  onEditDocument,
  onRefresh,
  error,
  loading = false
}: PatientDetailsDesktopProps) {
  const { formatDate } = useUserPreferences();
  const { isFreePlan } = useSubscription();
  
  // Photo upload states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Report states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Edit patient modal state
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: 'diary', label: 'Diary', count: diaryEntries.length },
    { id: 'documents', label: 'Documents', count: documents.length },
    { id: 'notes', label: 'Notes', count: diaryEntries.filter(e => e.entry_type === 'Note').length },
    { id: 'symptoms', label: 'Symptoms', count: symptoms.length },
    { id: 'medications', label: 'Medications', count: medications.length },
    { id: 'mood', label: 'Mood', count: moodEntries.length },
  ];

  const sortedDiaryEntries = [...diaryEntries].sort((a, b) => {
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

  const sortedSymptoms = [...symptoms].sort((a, b) => {
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    
    // First sort by start_date
    if (dateA !== dateB) {
      return sortAscending ? dateA - dateB : dateB - dateA;
    }
    
    // If dates are equal, sort by created_at timestamp
    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return sortAscending ? createdA - createdB : createdB - createdA;
  });

  const sortedMedications = [...medications].sort((a, b) => {
    const dateA = new Date(a.start_date).getTime();
    const dateB = new Date(b.start_date).getTime();
    
    // First sort by start_date
    if (dateA !== dateB) {
      return sortAscending ? dateA - dateB : dateB - dateA;
    }
    
    // If dates are equal, sort by created_at timestamp
    const createdA = new Date(a.created_at).getTime();
    const createdB = new Date(b.created_at).getTime();
    return sortAscending ? createdA - createdB : createdB - createdA;
  });

  const sortedDocuments = [...documents].sort((a, b) => {
    const dateA = new Date(a.uploaded_at).getTime();
    const dateB = new Date(b.uploaded_at).getTime();
    return sortAscending ? dateA - dateB : dateB - dateA;
  });

  const sortedNotes = [...diaryEntries.filter(e => e.entry_type === 'Note')].sort((a, b) => {
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

  const getIcon = (type: string) => {
    switch (type) {
      case 'Appointment':
        return <Calendar className="h-5 w-5 text-purple-600" />;
      case 'Diagnosis':
        return <Stethoscope className="h-5 w-5 text-purple-600" />;
      case 'Treatment':
        return <Pill className="h-5 w-5 text-purple-600" />;
      case 'AI':
        return <Brain className="h-5 w-5 text-purple-600" />;
      default:
        return <BookOpen className="h-5 w-5 text-purple-600" />;
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('Photo size must be less than 5MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setUploadError('Selected file must be an image');
        return;
      }
      
      setPhotoFile(file);
      setUploadError(null);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !patient) return;
    
    try {
      setUploading(true);
      setUploadError(null);
      
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploadError("User not authenticated.");
        setUploading(false);
        return;
      }

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
      const { error: updateError } = await supabase
        .from('patients')
        .update({ photo_url: publicUrl })
        .eq('id', patient.id);
        
      if (updateError) throw updateError;
      
      // Close modal and refresh data
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      onRefresh();
      
    } catch (err) {
      console.error('Error uploading photo:', err);
      setUploadError(`Error uploading photo: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSummaryPDF = () => {
    setShowSummaryModal(true);
  };

  const handleDetailsPDF = () => {
    setShowDetailsModal(true);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'diary':
        return (
          <div className="space-y-6">
            {/* Filtering Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search diary entries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 pl-10 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Date Range Picker */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    id="diary-start-date"
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeStart ? 'text-transparent' : 'text-text-primary'}`}
                    max={dateRangeEnd || undefined}
                  />
                  {!dateRangeStart && (
                    <div 
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => (document.getElementById('diary-start-date') as HTMLInputElement)?.showPicker()}
                    >
                      <span className="text-sm font-medium text-text-secondary">Start date</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    id="diary-end-date"
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeEnd ? 'text-transparent' : 'text-text-primary'}`}
                    min={dateRangeStart || undefined}
                  />
                  {!dateRangeEnd && (
                    <div 
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => (document.getElementById('diary-end-date') as HTMLInputElement)?.showPicker()}
                    >
                      <span className="text-sm font-medium text-text-secondary">End date</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sort Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSortAscending(!sortAscending)}
                  className="inline-flex items-center px-4 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm hover:bg-background-subtle transition-all duration-200"
                >
                  <span className="mr-2 text-text-secondary">Sort</span>
                  {sortAscending ? (
                    <ChevronUp className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add diary entry">
                <button
                  onClick={onAddDiaryEntry}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Entry
                </button>
              </SubscriptionFeatureBlock>
              
              <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add symptom">
                <button
                  onClick={onAddSymptom}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Symptom
                </button>
              </SubscriptionFeatureBlock>
            </div>

            <div className="space-y-6">
              {loading ? (
                // Skeleton loading for diary entries
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="p-6 bg-gradient-to-r from-background-light to-background-default rounded-lg shadow-md">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="w-24 h-4" variant="text" />
                      <div className="flex items-center space-x-3 w-32">
                        <Skeleton className="h-8 w-8 rounded-full" variant="avatar" />
                        <Skeleton className="h-4 w-16" variant="text" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-6 w-3/4 mb-2" variant="text" />
                        <Skeleton className="h-4 w-full mb-1" variant="text" />
                        <Skeleton className="h-4 w-2/3" variant="text" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {sortedDiaryEntries.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => onEditDiaryEntry(entry)}
                      className="cursor-pointer p-6 bg-gradient-to-r from-background-light to-background-default rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-24 text-sm font-medium text-primary">
                          {formatDate(entry.date)}
                        </div>
                        <div className="flex items-center space-x-3 w-32">
                          <div className="h-8 w-8 rounded-full bg-background-subtle flex items-center justify-center shadow-inner">
                            {getIcon(entry.entry_type)}
                          </div>
                          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
                            {entry.entry_type}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-text-primary mb-2">{entry.title}</h3>
                          {entry.notes && (
                            <p className="text-sm text-text-secondary line-clamp-3">{entry.notes}</p>
                          )}
                          {entry.attendees && entry.attendees.length > 0 && (
                            <p className="mt-2 text-sm text-text-secondary">
                              Attendees: {entry.attendees.join(', ')}
                            </p>
                          )}
                          {entry.severity && (
                            <span className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {entry.severity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {sortedDiaryEntries.length === 0 && (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-b from-background-subtle to-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-text-tertiary" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary">No diary entries yet</h3>
                      <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
                        Keep track of appointments, diagnoses, and treatments by adding diary entries.
                      </p>
                      <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add diary entry">
                        <button
                          onClick={onAddDiaryEntry}
                          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                        >
                          Add First Entry
                        </button>
                      </SubscriptionFeatureBlock>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'symptoms':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="inline-flex items-center px-4 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm hover:bg-background-subtle transition-all duration-200"
              >
                <ArrowUpDown className="h-4 w-4 mr-2 text-text-secondary" />
                Sort {sortAscending ? 'Newest First' : 'Oldest First'}
              </button>
              
              <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add symptom">
                <button
                  onClick={onAddSymptom}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Symptom
                </button>
              </SubscriptionFeatureBlock>
            </div>

            <div className="space-y-6">
              {loading ? (
                // Skeleton loading for symptoms
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="p-6 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md">
                    <div className="flex items-start space-x-4">
                      <Skeleton className="w-24 h-4" variant="text" />
                      <div className="flex items-center space-x-3 w-32">
                        <Skeleton className="h-8 w-8 rounded-full" variant="avatar" />
                        <Skeleton className="h-4 w-16" variant="text" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Skeleton className="h-6 w-3/4 mb-2" variant="text" />
                        <Skeleton className="h-4 w-full mb-1" variant="text" />
                        <Skeleton className="h-4 w-1/2" variant="text" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <>
                  {sortedSymptoms.map((symptom) => (
                    <div
                      key={symptom.id}
                      onClick={() => onEditSymptom(symptom)}
                      className="cursor-pointer p-6 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0 w-24 text-sm font-medium text-teal-900">
                          {formatDate(symptom.start_date)}
                        </div>
                        <div className="flex items-center space-x-3 w-32">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center shadow-inner ${
                            symptom.severity === 'Severe' ? 'bg-error-light text-error' :
                            symptom.severity === 'Moderate' ? 'bg-warning-light text-warning' : 'bg-success-light text-success'
                          }`}>
                            <Stethoscope className={`h-5 w-5 ${
                              symptom.severity === 'Severe' ? 'text-error' :
                              symptom.severity === 'Moderate' ? 'text-warning' : 'text-success'
                            }`} />
                          </div>
                          <span className="text-sm font-semibold text-text-primary whitespace-nowrap">
                            {symptom.severity}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-text-primary mb-2">{symptom.description}</h3>
                          {symptom.notes && (
                            <p className="text-sm text-text-secondary line-clamp-3">{symptom.notes}</p>
                          )}
                          {symptom.end_date && (
                            <p className="mt-2 text-sm text-text-secondary">
                              Ended: {formatDate(symptom.end_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {sortedSymptoms.length === 0 && (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-b from-background-subtle to-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                        <Stethoscope className="h-10 w-10 text-text-tertiary" />
                      </div>
                      <h3 className="text-lg font-semibold text-text-primary">No symptoms tracked</h3>
                      <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
                        Monitor health conditions by tracking symptoms, their severity, and duration.
                      </p>
                      <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Track symptoms">
                        <button
                          onClick={onAddSymptom}
                          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark"
                        >
                          Track First Symptom
                        </button>
                      </SubscriptionFeatureBlock>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Document uploads">
                <button
                  onClick={onAddDocument}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </button>
              </SubscriptionFeatureBlock>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {sortedDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onEditDocument(doc)}
                  className="cursor-pointer relative flex items-center space-x-3 rounded-lg border border-border-default bg-white px-6 py-5 shadow-sm hover:border-border-hover transition-colors"
                >
                  <div className="flex-shrink-0">
                    <FileText className="h-10 w-10 text-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">{doc.file_name}</p>
                    <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                      {doc.description || 'No description'}
                    </p>
                  </div>
                </div>
              ))}

              {sortedDocuments.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <div className="bg-gradient-to-b from-background-subtle to-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-text-tertiary" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">No documents uploaded</h3>
                  <p className="mt-2 text-sm text-text-secondary max-w-sm mx-auto">
                    Upload medical records, test results, and other important documents to keep everything in one place.
                  </p>
                  <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Document uploads">
                    <button
                      onClick={onAddDocument}
                      className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark"
                    >
                      Upload First Document
                    </button>
                  </SubscriptionFeatureBlock>
                </div>
              )}
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-4">
            {/* Filtering Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Search Bar */}
              <div className="lg:col-span-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 pl-10 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
              
              {/* Date Range Picker */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    id="notes-start-date"
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeStart ? 'text-transparent' : 'text-text-primary'}`}
                    max={dateRangeEnd || undefined}
                  />
                  {!dateRangeStart && (
                    <div 
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => (document.getElementById('notes-start-date') as HTMLInputElement)?.showPicker()}
                    >
                      <span className="text-sm font-medium text-text-secondary">Start date</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    id="notes-end-date"
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeEnd ? 'text-transparent' : 'text-text-primary'}`}
                    min={dateRangeStart || undefined}
                  />
                  {!dateRangeEnd && (
                    <div 
                      className="absolute inset-0 flex items-center px-3 cursor-pointer"
                      onClick={() => (document.getElementById('notes-end-date') as HTMLInputElement)?.showPicker()}
                    >
                      <span className="text-sm font-medium text-text-secondary">End date</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sort Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setSortAscending(!sortAscending)}
                  className="inline-flex items-center px-4 py-2.5 bg-white text-sm font-medium rounded-lg border border-border-default shadow-sm hover:bg-background-subtle transition-all duration-200"
                >
                  <span className="mr-2 text-text-secondary">Sort</span>
                  {sortAscending ? (
                    <ChevronUp className="h-4 w-4 text-text-secondary" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-text-secondary" />
                  )}
                </button>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-end">
              <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add notes">
                <button
                  onClick={onAddNote}
                  className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-primary to-secondary hover:from-primary-dark hover:to-secondary-dark text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </button>
              </SubscriptionFeatureBlock>
            </div>
            
            {sortedNotes.length > 0 ? (
              <div className="space-y-4">
                {sortedNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => onEditNote(note)}
                    className="cursor-pointer p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{note.title}</h3>
                      <span className="text-sm text-gray-500 flex-shrink-0 ml-2">{formatDate(note.date)}</span>
                    </div>
                    {note.notes && (
                      <p className="text-sm text-gray-600 line-clamp-3">{note.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                  <BookOpen className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No notes yet</h3>
                <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                  Add notes to keep track of important information, observations, and reminders.
                </p>
                <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add notes">
                  <button
                    onClick={onAddNote}
                    className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                  >
                    Add First Note
                  </button>
                </SubscriptionFeatureBlock>
              </div>
            )}
          </div>
        );

      case 'medications':
        return (
          <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Medication tracking">
            <MedicationList
              patientId={patient?.id || ''}
              medications={sortedMedications}
              onUpdate={onRefresh}
              isFreePlan={isFreePlan}
            />
          </SubscriptionFeatureBlock>
        );

      case 'mood':
        return (
          <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Mood tracking">
            <MoodTab
              patientId={patient?.id || ''}
              initialEntries={moodEntries}
              isFreePlan={isFreePlan}
            />
          </SubscriptionFeatureBlock>
        );

      default:
        return null;
    }
  };

  return (
    <Layout title={patient?.full_name}>
      <div className="w-full max-w-none overflow-x-hidden">
        {error && (
          <div className="mb-6">
            <div className="bg-red-50 p-4 rounded-md">
              <h2 className="text-lg font-semibold text-red-800">Error loading patient: {error}</h2>
            </div>
          </div>
        )}

        <div className="bg-white shadow-sm rounded-xl overflow-hidden animate-fade-down">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <div className="relative">
                  {loading ? (
                    <Skeleton className="w-24 h-24 rounded-full" variant="avatar" />
                  ) : (
                    <button 
                      onClick={() => setShowPhotoModal(true)}
                      className="group relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 hover:border-teal-500 transition-colors duration-200"
                    >
                      {patient?.photo_url ? (
                        <img
                          src={patient.photo_url}
                          alt={patient.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <span className="text-4xl font-semibold text-gray-400">
                            {patient?.full_name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </button>
                  )}
                </div>
                <div>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-48" variant="text" />
                      <Skeleton className="h-4 w-32" variant="text" />
                    </div>
                  ) : (
                    <>
                      <h2 className={tokens.typography.sizes.h2}>{patient?.full_name}</h2>
                      <p className="text-gray-500">{patient?.relationship}</p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex space-x-3">
                {/* Diary Entry Button - Teal */}
                <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add diary entry">
                  <button
                    onClick={onAddDiaryEntry}
                    className="bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center px-6 py-4"
                    title="Add Diary Entry"
                  >
                    <Calendar className="h-6 w-6" />
                  </button>
                </SubscriptionFeatureBlock>
                
                {/* Add Symptom Button - Purple */}
                <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Track symptoms">
                  <button
                    onClick={onAddSymptom}
                    className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center px-6 py-4"
                    title="Add Symptom"
                  >
                    <MdOutlineSick className="h-6 w-6" />
                  </button>
                </SubscriptionFeatureBlock>
                
                {/* Doctor Overview Button - Blue */}
                {patient && (
                  <button
                    onClick={handleSummaryPDF}
                    className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center px-6 py-4"
                    title="Doctor overview"
                  >
                    <Stethoscope className="h-6 w-6" />
                  </button>
                )}
                
                {/* Print Details Button - Gray */}
                {patient && (
                  <button
                    onClick={handleDetailsPDF}
                    className="bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center px-6 py-4"
                    title="Print Details"
                  >
                    <Printer className="h-6 w-6" />
                  </button>
                )}
              </div>
            </div>

            {/* Personal Information (Collapsible) */}
            <div className="border-t pt-4">
              <button
                onClick={() => setShowPatientInfo(!showPatientInfo)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">Personal information</span>
                {showPatientInfo ? (
                  <ChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </button>
              {showPatientInfo && patient && (
                <div className="px-6 pb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-medium text-gray-700">Patient Details</h4>
                    <button
                      onClick={() => setShowEditPatientModal(true)}
                      className="inline-flex items-center px-3 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                      <p className="mt-1">{formatDate(patient.dob)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Birth sex</label>
                      <p className="mt-1">{patient.gender}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                      <p className="mt-1">{patient.phone_number}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Country</label>
                      <p className="mt-1">{patient.country}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Address</label>
                      <p className="mt-1">{patient.address}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      {patient.notes ? (
                        <p className="mt-1 whitespace-pre-wrap">{patient.notes}</p>
                      ) : (
                        <div className="mt-1 p-4 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
                          <div className="text-center">
                            <BookOpen className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-600 font-medium mb-1">No patient information added yet</p>
                            <p className="text-xs text-gray-500">
                              Consider adding family history, allergies, cultural background, religious preferences, nationality, or other relevant details that healthcare providers should know.
                            </p>
                            <button
                              onClick={() => setShowEditPatientModal(true)}
                              className="mt-3 inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-xs font-medium rounded-md shadow-sm transition-all duration-200"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Add Information
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Health Insights */}
          <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
            <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              AI Health Insights
            </h3>
            {loading ? (
              <div className="flex space-x-3">
                <Skeleton className="h-10 w-24 rounded-lg" variant="button" />
                <Skeleton className="h-10 w-32 rounded-lg" variant="button" />
                <Skeleton className="h-10 w-28 rounded-lg" variant="button" />
              </div>
            ) : (
              <SubscriptionFeatureBlock featureName="AI health insights">
                <AIAnalysisButtons
                  patientId={patient?.id || ''}
                  diaryEntries={diaryEntries}
                  symptoms={symptoms}
                  patient={patient}
                  onSuccess={onRefresh}
                  autoCreate={!isFreePlan}
                />
              </SubscriptionFeatureBlock>
            )}
          </div>

          {/* Desktop Tabs */}
          <div className="border-b">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm inline-flex items-center whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-teal-500 text-teal-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {loading ? (
                    <Skeleton className="ml-2 h-5 w-6 rounded-full" variant="button" />
                  ) : (
                    tab.count !== undefined && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        activeTab === tab.id
                          ? 'bg-teal-100 text-teal-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {tab.count}
                      </span>
                    )
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6 bg-white max-w-full overflow-x-hidden">
            {renderTabContent()}
          </div>
        </div>

        {/* Photo Upload Modal */}
        {showPhotoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg max-w-md w-full mx-4 p-6 animate-fade-down">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Update Photo</h2>
                <button
                  onClick={() => {
                    setShowPhotoModal(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setUploadError(null);
                  }}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-medium
                    file:bg-teal-50 file:text-teal-700
                    hover:file:bg-teal-100"
                />
              </div>
              
              {photoPreview && (
                <div className="mb-4">
                  <div className="aspect-square w-40 mx-auto overflow-hidden rounded-full border-2 border-teal-100">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}
              
              {uploadError && (
                <div className="mb-4 rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{uploadError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowPhotoModal(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                    setUploadError(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePhotoUpload}
                  disabled={!photoFile || uploading}
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md shadow-sm hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Update Photo'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary PDF Modal */}
        {showSummaryModal && patient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col animate-fade-down">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold">Summary Report</h3>
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <GenerateReport
                  patient={patient}
                  diaryEntries={diaryEntries}
                  symptoms={symptoms}
                  medications={medications}
                  moodEntries={moodEntries}
                  type="summary"
                  onClose={() => setShowSummaryModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Details PDF Modal */}
        {showDetailsModal && patient && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md max-h-[80vh] flex flex-col animate-fade-down">
              <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
                <h3 className="text-lg font-semibold">Detailed Report</h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <DetailedReportModal
                  patient={patient}
                  diaryEntries={diaryEntries}
                  symptoms={symptoms}
                  medications={medications}
                  moodEntries={moodEntries}
                  onClose={() => setShowDetailsModal(false)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit Patient Modal */}
        <EditPatientModal
          isOpen={showEditPatientModal}
          onClose={() => setShowEditPatientModal(false)}
          patient={patient}
          onSuccess={onRefresh}
        />
      </div>
    </Layout>
  );
}