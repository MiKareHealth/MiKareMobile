import React, { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Download, 
  Menu, 
  LogOut, 
  Smile, 
  Brain, 
  Stethoscope, 
  Pill, 
  BookOpen, 
  FileText, 
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Camera,
  X,
  AlertCircle,
  Printer,
  Home,
  UserPlus,
  Plus
} from 'lucide-react';
import { MdOutlineSick } from 'react-icons/md';
import MedicationList from './MedicationList';
import MoodTab from './MoodTab';
import AIAnalysisButtons from './AIAnalysisButtons';
import ReportMenu from './ReportMenu';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { getEmoji } from '../utils/moodUtils';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { Patient, DiaryEntry, Symptom, PatientDocument, Medication, MoodEntry } from '../types/database';
import { TabType } from '../pages/PatientDetails';
import Skeleton from './Skeleton';
import { MIKARE_HEART_LOGO } from '../config/branding';
import { GenerateReport } from './PDFExport';
import SubscriptionFeatureBlock from './SubscriptionFeatureBlock';
import { useSubscription } from '../hooks/useSubscription';
import { usePatients, PatientSummary } from '../contexts/PatientsContext';

type Tab = {
  id: TabType;
  label: string;
  count?: number;
};

interface PatientDetailsMobileProps {
  patient: Patient | null;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  documents: PatientDocument[];
  medications: Medication[];
  moodEntries: MoodEntry[];
  todaysMood: MoodEntry | null;
  activeTab: TabType;
  setActiveTab: Dispatch<SetStateAction<TabType>>;
  sortAscending: boolean;
  setSortAscending: (sort: boolean) => void;
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
  onMoodEntry: () => void;
  onRefresh: () => void;
  error: string | null;
  loading?: boolean;
}

export default function PatientDetailsMobile({
  patient,
  diaryEntries,
  symptoms,
  documents,
  medications,
  moodEntries,
  todaysMood,
  activeTab,
  setActiveTab,
  sortAscending,
  setSortAscending,
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
  onMoodEntry,
  onRefresh,
  error,
  loading = false,
}: PatientDetailsMobileProps) {
  const navigate = useNavigate();
  const { formatDate } = useUserPreferences();
  const { isFreePlan } = useSubscription();
  const { patients, loading: patientsLoading } = usePatients();
  
  // Photo upload states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Modal states
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Mobile menu states
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/signin');
  };

  const tabs: Tab[] = [
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
    return sortAscending ? dateA - dateB : dateB - dateA;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'Appointment':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'Diagnosis':
        return <Stethoscope className="h-4 w-4 text-purple-600" />;
      case 'Treatment':
        return <Pill className="h-4 w-4 text-purple-600" />;
      case 'AI':
        return <Brain className="h-4 w-4 text-purple-600" />;
      default:
        return <BookOpen className="h-4 w-4 text-purple-600" />;
    }
  };

  const activeTabLabel = tabs.find(tab => tab.id === activeTab)?.label || 'Select Tab';

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
      setUploadError(`Error uploading photo: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'diary':
        return (
          <div className="space-y-4">
            {/* Filtering Controls */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search diary entries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Date Range Picker */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    id="mobile-diary-start-date"
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeStart ? 'text-transparent' : 'text-gray-900'}`}
                    max={dateRangeEnd || undefined}
                  />
                  {!dateRangeStart && (
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <span className="text-sm font-medium text-gray-500">Start date</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    id="mobile-diary-end-date"
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeEnd ? 'text-transparent' : 'text-gray-900'}`}
                    min={dateRangeStart || undefined}
                  />
                  {!dateRangeEnd && (
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <span className="text-sm font-medium text-gray-500">End date</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sort and Action Buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSortAscending(!sortAscending)}
                  className="inline-flex items-center justify-center px-3 py-2 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="mr-2 text-gray-500">Sort</span>
                  {sortAscending ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                
                <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add diary entry">
                  <button
                    onClick={onAddDiaryEntry}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Entry
                  </button>
                </SubscriptionFeatureBlock>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between mb-3">
                    <Skeleton className="h-6 w-1/2" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center" />
                      <Skeleton className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center" />
                    </div>
                  </div>
                ))
              ) : (
                sortedDiaryEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => onEditDiaryEntry(entry)}
                    className="cursor-pointer p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-teal-900">
                        {formatDate(entry.date)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                          {getIcon(entry.entry_type)}
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {entry.entry_type}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">
                      {entry.title}
                    </h3>
                    
                    {entry.notes && (
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        {entry.notes.length > 120 ? `${entry.notes.substring(0, 120)}...` : entry.notes}
                      </p>
                    )}
                    
                    {entry.attendees && entry.attendees.length > 0 && (
                      <p className="text-sm text-gray-500 mb-2">
                        <span className="font-medium">Attendees:</span> {entry.attendees.join(', ')}
                      </p>
                    )}
                    
                    {entry.severity && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Severity: {entry.severity}
                      </span>
                    )}
                  </div>
                ))
              )}

              {loading ? (
                <div className="text-center py-12">
                  <Skeleton className="h-16 w-16 mx-auto mb-4" />
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ) : (
                sortedDiaryEntries.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No diary entries yet</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Keep track of appointments, diagnoses, and treatments by adding diary entries.
                    </p>
                    <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add diary entry">
                      <button
                        onClick={onAddDiaryEntry}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                      >
                        Add First Entry
                      </button>
                    </SubscriptionFeatureBlock>
                  </div>
                )
              )}
            </div>
          </div>
        );

      case 'symptoms':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setSortAscending(!sortAscending)}
                className="inline-flex items-center justify-center px-3 py-2 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all duration-200"
              >
                <ArrowUpDown className="h-4 w-4 mr-2 text-gray-500" />
                Sort {sortAscending ? 'Newest First' : 'Oldest First'}
              </button>
              
              <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Track symptoms">
                <button
                  onClick={onAddSymptom}
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Symptom
                </button>
              </SubscriptionFeatureBlock>
            </div>

            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between mb-3">
                    <Skeleton className="h-6 w-1/2" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center" />
                      <Skeleton className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center" />
                    </div>
                  </div>
                ))
              ) : (
                sortedSymptoms.map((symptom) => (
                  <div
                    key={symptom.id}
                    onClick={() => onEditSymptom(symptom)}
                    className="cursor-pointer p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-semibold text-teal-900">
                        {formatDate(symptom.start_date)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center ${
                          symptom.severity === 'Severe' ? 'bg-red-100' :
                          symptom.severity === 'Moderate' ? 'bg-yellow-100' : 'bg-green-100'
                        }`}>
                          <Stethoscope className={`h-4 w-4 ${
                            symptom.severity === 'Severe' ? 'text-red-600' :
                            symptom.severity === 'Moderate' ? 'text-yellow-600' : 'text-green-600'
                          }`} />
                        </div>
                        <span className="text-sm font-medium text-gray-700">
                          {symptom.severity}
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-base font-bold text-gray-900 mb-2 leading-tight">
                      {symptom.description}
                    </h3>
                    
                    {symptom.notes && (
                      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                        {symptom.notes.length > 120 ? `${symptom.notes.substring(0, 120)}...` : symptom.notes}
                      </p>
                    )}
                    
                    {symptom.end_date && (
                      <p className="text-sm text-gray-500">
                        <span className="font-medium">Ended:</span> {formatDate(symptom.end_date)}
                      </p>
                    )}
                  </div>
                ))
              )}

              {loading ? (
                <div className="text-center py-12">
                  <Skeleton className="h-16 w-16 mx-auto mb-4" />
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ) : (
                sortedSymptoms.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <Stethoscope className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No symptoms tracked</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Monitor health conditions by tracking symptoms, their severity, and duration.
                    </p>
                    <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Track symptoms">
                      <button
                        onClick={onAddSymptom}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                      >
                        Track First Symptom
                      </button>
                    </SubscriptionFeatureBlock>
                  </div>
                )
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
                  className="inline-flex items-center justify-center w-full px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg text-sm font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Document
                </button>
              </SubscriptionFeatureBlock>
            </div>
            
            <div className="space-y-3">
              {loading ? (
                Array.from({ length: 3 }, (_, index) => (
                  <div key={index} className="flex items-center space-x-3 rounded-lg border border-gray-300 bg-white p-4 shadow-sm hover:border-gray-400 hover:shadow-md transition-all duration-200">
                    <Skeleton className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </div>
                  </div>
                ))
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onEditDocument(doc)}
                    className="cursor-pointer flex items-center space-x-3 rounded-lg border border-gray-300 bg-white p-4 shadow-sm hover:border-gray-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex-shrink-0">
                      <FileText className="h-8 w-8 text-gray-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-semibold text-gray-900 truncate">{doc.file_name}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {doc.description || 'No description provided'}
                      </p>
                    </div>
                  </div>
                ))
              )}

              {loading ? (
                <div className="text-center py-12">
                  <Skeleton className="h-16 w-16 mx-auto mb-4" />
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ) : (
                documents.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">No documents uploaded</h3>
                    <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                      Upload medical records, test results, and other important documents to keep everything in one place.
                    </p>
                    <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Document uploads">
                      <button
                        onClick={onAddDocument}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                      >
                        Upload First Document
                      </button>
                    </SubscriptionFeatureBlock>
                  </div>
                )
              )}
            </div>
          </div>
        );

      case 'notes':
        const noteEntries = diaryEntries.filter(entry => entry.entry_type === 'Note');
        return (
          <div className="space-y-4">
            {/* Filtering Controls */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 pl-10 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              
              {/* Date Range Picker */}
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    id="mobile-notes-start-date"
                    type="date"
                    value={dateRangeStart}
                    onChange={(e) => setDateRangeStart(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeStart ? 'text-transparent' : 'text-gray-900'}`}
                    max={dateRangeEnd || undefined}
                  />
                  {!dateRangeStart && (
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <span className="text-sm font-medium text-gray-500">Start date</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 relative">
                  <input
                    id="mobile-notes-end-date"
                    type="date"
                    value={dateRangeEnd}
                    onChange={(e) => setDateRangeEnd(e.target.value)}
                    className={`w-full px-3 py-2.5 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm focus:ring-2 focus:ring-teal-300 focus:border-teal-500 transition-all duration-200 ${!dateRangeEnd ? 'text-transparent' : 'text-gray-900'}`}
                    min={dateRangeStart || undefined}
                  />
                  {!dateRangeEnd && (
                    <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
                      <span className="text-sm font-medium text-gray-500">End date</span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Sort and Action Buttons */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSortAscending(!sortAscending)}
                  className="inline-flex items-center justify-center px-3 py-2 bg-white text-sm font-medium rounded-lg border border-gray-300 shadow-sm hover:bg-gray-50 transition-all duration-200"
                >
                  <span className="mr-2 text-gray-500">Sort</span>
                  {sortAscending ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </button>
                
                <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add notes">
                  <button
                    onClick={onAddNote}
                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg text-sm font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </button>
                </SubscriptionFeatureBlock>
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-12">
                <Skeleton className="h-16 w-16 mx-auto mb-4" />
                <Skeleton className="h-6 w-1/2 mx-auto" />
                <Skeleton className="h-4 w-1/3 mx-auto" />
              </div>
            ) : (
              noteEntries.length > 0 ? (
                <div className="space-y-3">
                  {noteEntries.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onEditNote(note)}
                      className="cursor-pointer p-4 bg-gradient-to-r from-teal-50 to-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-base font-bold text-gray-900 leading-tight flex-1 mr-2">
                          {note.title}
                        </h3>
                        <span className="text-sm text-gray-500 flex-shrink-0">
                          {formatDate(note.date)}
                        </span>
                      </div>
                      {note.notes && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {note.notes.length > 120 ? `${note.notes.substring(0, 120)}...` : note.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                    <BookOpen className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">No notes yet</h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">
                    Add notes to keep track of important information, observations, and reminders.
                  </p>
                  <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add notes">
                    <button
                      onClick={onAddNote}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700"
                    >
                      Add First Note
                    </button>
                  </SubscriptionFeatureBlock>
                </div>
              )
            )}
          </div>
        );

      case 'medications':
        return (
          <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Medication tracking">
            <MedicationList
              patientId={patient?.id || ''}
              medications={medications}
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Backdrop */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 w-64 bg-white shadow-lg 
        transform transition-transform duration-300 ease-in-out 
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        z-50 border-r border-gray-200
      `}>
        <div className="h-full flex flex-col">
          {/* Menu Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <img 
              src={MIKARE_HEART_LOGO}
              alt="MiKare" 
              className="h-8" 
            />
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Menu Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {/* Navigation Section */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2">
                <button
                  onClick={() => {
                    navigate('/');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-start px-3 py-2 rounded-md transition-all duration-200 text-teal-900 hover:bg-white/50"
                >
                  <Home className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="font-medium">Home</span>
                </button>
              </div>

              {/* Actions Section */}
              <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2">
                <button
                  onClick={() => {
                    navigate('/add-patient');
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-start px-3 py-2 rounded-md transition-all duration-200 text-teal-900 hover:bg-white/50"
                >
                  <UserPlus className="h-5 w-5 mr-2 flex-shrink-0" />
                  <span className="font-medium">Add person</span>
                </button>
              </div>

              {/* Patients List */}
              {patientsLoading ? (
                <div className="text-center py-12">
                  <Skeleton className="h-16 w-16 mx-auto mb-4" />
                  <Skeleton className="h-6 w-1/2 mx-auto" />
                  <Skeleton className="h-4 w-1/3 mx-auto" />
                </div>
              ) : (
                <div className="bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-lg p-2">
                  <h3 className="px-3 py-2 text-sm font-semibold text-teal-900">
                    My people
                  </h3>
                  <div className="mt-2 space-y-1">
                    {patients.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          navigate(`/patient/${p.id}`);
                          setIsMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-start px-3 py-2 rounded-md transition-all duration-200 ${
                          p.id === patient?.id 
                            ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-md' 
                            : 'text-teal-900 hover:bg-white/50'
                        }`}
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-white/80 shadow-inner">
                          {p.photo_url ? (
                            <img
                              src={p.photo_url}
                              alt={p.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-100 to-teal-200 text-teal-600 font-medium">
                              {p.full_name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="ml-3 font-medium truncate">
                          {p.full_name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Menu Footer */}
          <div className="p-4 border-t bg-gradient-to-br from-teal-50 to-teal-100/50">
            <button
              onClick={() => {
                navigate('/settings');
                setIsMenuOpen(false);
              }}
              className="w-full flex items-center justify-start px-3 py-2 rounded-md transition-all duration-200 text-teal-900 hover:bg-white/50"
            >
              <span className="ml-2 font-medium">Profile & Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Row 1: Header with Menu and Sign Out */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          >
            <Menu className="h-6 w-6" />
          </button>
          <span className="text-lg font-semibold text-gray-900 truncate">
            {patient?.full_name || 'Patient'}
          </span>
          <button
            onClick={handleSignOut}
            className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold py-2 px-3 rounded-md shadow-sm text-sm"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content starts below fixed header */}
      <div className="pt-16">
        {error && (
          <div className="p-4 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-800">Error loading patient: {error}</p>
          </div>
        )}

        {/* Row 2: Four Action Buttons */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 w-full">
          <div className="grid grid-cols-4 gap-2 w-full">
            {/* Diary Button - Teal */}
            <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Add diary entry">
              <button
                onClick={onAddDiaryEntry}
                className="w-full bg-gradient-to-br from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center py-4"
              >
                <Calendar className="h-6 w-6" />
              </button>
            </SubscriptionFeatureBlock>
            
            {/* Symptom Button - Purple */}
            <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Track symptoms">
              <button
                onClick={onAddSymptom}
                className="w-full bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center py-4"
              >
                <MdOutlineSick className="h-6 w-6" />
              </button>
            </SubscriptionFeatureBlock>
            
            {/* Doctor Overview Button - Blue */}
            <button
              onClick={() => {
                if (patient) {
                  setShowSummaryModal(true);
                }
              }}
              className="w-full bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center py-4"
            >
              <Stethoscope className="h-6 w-6" />
            </button>
            
            {/* Print Report Button - Gray */}
            <button
              onClick={() => {
                if (patient) {
                  setShowDetailsModal(true);
                }
              }}
              className="w-full bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center py-4"
            >
              <Printer className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Row 3: Patient Name and Profile */}
        <div className="p-6 bg-white border-b border-gray-200">
          {loading ? (
            <div className="flex items-center space-x-4">
              <Skeleton className="w-20 h-20" rounded="rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <button 
                  onClick={() => setShowPhotoModal(true)}
                  className="group relative w-20 h-20 rounded-full overflow-hidden border-4 border-white/20 shadow-lg"
                >
                  {patient?.photo_url ? (
                    <img
                      src={patient.photo_url}
                      alt={patient.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <span className="text-3xl font-bold text-gray-600">
                        {patient?.full_name?.charAt(0) || 'M'}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                
                </button>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 leading-tight">
                  {patient?.full_name || 'Patient Name'}
                </h2>
                <p className="text-lg text-gray-600 font-medium mt-1">
                  {patient?.relationship || 'Relationship'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Log Today's Mood Button */}
        <div className="p-4 bg-white border-b border-gray-200">
          <SubscriptionFeatureBlock featureName="Mood tracking">
            <button
              onClick={onMoodEntry}
              disabled={!!todaysMood}
              className={`w-full px-6 py-4 rounded-xl text-lg font-semibold transition-all duration-200 flex items-center justify-center shadow-lg ${
                todaysMood
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-teal-400 to-teal-500 hover:from-teal-500 hover:to-teal-600 text-white'
              }`}
            >
              {todaysMood ? (
                <span className="flex items-center">
                  <span className="mr-3 text-2xl">{getEmoji(todaysMood.mood)}</span>
                  Today's mood logged
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-3 text-2xl">😊</span>
                  Log today's mood
                </span>
              )}
            </button>
          </SubscriptionFeatureBlock>
        </div>

        {/* AI Health Insights */}
        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-b">
          <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center">
            <Brain className="h-4 w-4 mr-2 text-purple-600" />
            AI Health Insights
          </h3>
          <SubscriptionFeatureBlock featureName="AI health insights">
            <AIAnalysisButtons
              patientId={patient?.id || ''}
              diaryEntries={diaryEntries}
              symptoms={symptoms}
              onSuccess={onRefresh}
              autoCreate={!isFreePlan}
            />
          </SubscriptionFeatureBlock>
        </div>

        {/* Tab Navigation Dropdown */}
        <div className="p-4 border-b bg-gray-50">
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => {
                const value = e.target.value as TabType;
                setActiveTab(() => value);
              }}
              className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-base font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                  {tab.count !== undefined && ` (${tab.count})`}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 bg-white">
          {renderTabContent()}
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
                <GenerateReport
                  patient={patient}
                  diaryEntries={diaryEntries}
                  symptoms={symptoms}
                  medications={medications}
                  moodEntries={moodEntries}
                  type="detailed"
                  onClose={() => setShowDetailsModal(false)}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}