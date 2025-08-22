import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabaseClient';
import DiaryEntryModal from '../../components/DiaryEntryModal';
import SymptomModal from '../../components/SymptomModal';
import NoteModal from '../../components/NoteModal';
import DocumentModal from '../../components/DocumentModal';
import MoodEntryModal from '../../components/MoodEntryModal';
import PatientDetailsDesktop from '../../components/PatientDetailsDesktop';
import PatientDetailsMobile from '../../components/PatientDetailsMobile';
import { usePatientData } from '../../hooks/usePatientData';
import { useSubscription } from '../../hooks/useSubscription';
import type { PatientDocument, DiaryEntry, Symptom } from '../../types/database';
import { log } from '../../utils/logger';

export type TabType = 'diary' | 'documents' | 'notes' | 'symptoms' | 'medications' | 'mood';

export default function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('diary');
  const [showPatientInfo, setShowPatientInfo] = useState(false);
  const [showDiaryEntry, setShowDiaryEntry] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [selectedSymptom, setSelectedSymptom] = useState<Symptom | null>(null);
  const [selectedNote, setSelectedNote] = useState<DiaryEntry | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<PatientDocument | null>(null);
  const [selectedDiaryEntry, setSelectedDiaryEntry] = useState<DiaryEntry | null>(null);
  const [sortAscending, setSortAscending] = useState(false);
  
  // New filtering state
  const [dateRangeStart, setDateRangeStart] = useState<string>('');
  const [dateRangeEnd, setDateRangeEnd] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { isFreePlan } = useSubscription();
  
  const { patient, documents, symptoms, diaryEntries, medications, moodEntries, todaysMood, loading, error, refresh, refreshTable } = usePatientData(id!);

  // Listen for Meeka data update events
  useEffect(() => {
    const handleMeekaDataUpdate = (event: CustomEvent) => {
      const { table, action, patientId: eventPatientId } = event.detail;
      
      // Only refresh if this event is for the current patient
      if (eventPatientId === id) {
        log('PatientDetails: Received Meeka data update event for table:', table);
        refreshTable(table);
      }
    };

    window.addEventListener('meekaDataUpdate', handleMeekaDataUpdate as EventListener);
    
    return () => {
      window.removeEventListener('meekaDataUpdate', handleMeekaDataUpdate as EventListener);
    };
  }, [id, refreshTable]);

  // Memoize filtered diary entries to prevent unnecessary recalculations
  const filteredDiaryEntries = useMemo(() => {
    return diaryEntries.filter(entry => {
      // Date range filtering
      if (dateRangeStart && new Date(entry.date) < new Date(dateRangeStart)) {
        return false;
      }
      if (dateRangeEnd && new Date(entry.date) > new Date(dateRangeEnd)) {
        return false;
      }
      
      // Search term filtering (minimum 3 characters)
      if (searchTerm.length >= 3) {
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = entry.title?.toLowerCase().includes(searchLower);
        const notesMatch = entry.notes?.toLowerCase().includes(searchLower);
        const typeMatch = entry.entry_type?.toLowerCase().includes(searchLower);
        const attendeesMatch = entry.attendees?.some(attendee => 
          attendee.toLowerCase().includes(searchLower)
        );
        
        if (!titleMatch && !notesMatch && !typeMatch && !attendeesMatch) {
          return false;
        }
      }
      
      return true;
    });
  }, [diaryEntries, dateRangeStart, dateRangeEnd, searchTerm]);

  // Only log when values actually change (for debugging)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      log('Date range:', { dateRangeStart, dateRangeEnd });
      log('Filtered entries count:', filteredDiaryEntries.length, 'of', diaryEntries.length);
    }
  }, [dateRangeStart, dateRangeEnd, filteredDiaryEntries.length, diaryEntries.length]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Event handlers
  const handleAddSymptom = () => {
    setSelectedSymptom(null);
    setShowSymptomModal(true);
  };

  const handleEditSymptom = (symptom: Symptom) => {
    setSelectedSymptom(symptom);
    setShowSymptomModal(true);
  };

  const handleAddNote = () => {
    setSelectedNote(null);
    setShowNoteModal(true);
  };

  const handleEditNote = (note: DiaryEntry) => {
    setSelectedNote(note);
    setShowNoteModal(true);
  };

  const handleAddDocument = () => {
    setSelectedDocument(null);
    setShowDocumentModal(true);
  };

  const handleEditDocument = (document: PatientDocument) => {
    setSelectedDocument(document);
    setShowDocumentModal(true);
  };
  
  const handleAddDiaryEntry = () => {
    setSelectedDiaryEntry(null);
    setShowDiaryEntry(true);
  };

  const handleEditDiaryEntry = (entry: DiaryEntry) => {
    setSelectedDiaryEntry(entry);
    setShowDiaryEntry(true);
  };

  const handleMoodEntry = () => {
    setShowMoodModal(true);
  };

  return (
    <>
      {/* Mobile Layout - Show only on mobile */}
      <div className="block md:hidden">
        <PatientDetailsMobile
          patient={patient}
          diaryEntries={filteredDiaryEntries}
          symptoms={symptoms}
          documents={documents}
          medications={medications}
          moodEntries={moodEntries}
          todaysMood={todaysMood}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sortAscending={sortAscending}
          setSortAscending={setSortAscending}
          dateRangeStart={dateRangeStart}
          setDateRangeStart={setDateRangeStart}
          dateRangeEnd={dateRangeEnd}
          setDateRangeEnd={setDateRangeEnd}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddDiaryEntry={handleAddDiaryEntry}
          onEditDiaryEntry={handleEditDiaryEntry}
          onAddSymptom={handleAddSymptom}
          onEditSymptom={handleEditSymptom}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onAddDocument={handleAddDocument}
          onEditDocument={handleEditDocument}
          onMoodEntry={handleMoodEntry}
          onRefresh={refresh}
          error={error}
          loading={loading}
          showPatientInfo={showPatientInfo}
          setShowPatientInfo={setShowPatientInfo}
        />
      </div>

      {/* Desktop Layout - Show only on desktop */}
      <div className="hidden md:block">
        <PatientDetailsDesktop
          patient={patient}
          diaryEntries={filteredDiaryEntries}
          symptoms={symptoms}
          documents={documents}
          medications={medications}
          moodEntries={moodEntries}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sortAscending={sortAscending}
          setSortAscending={setSortAscending}
          showPatientInfo={showPatientInfo}
          setShowPatientInfo={setShowPatientInfo}
          dateRangeStart={dateRangeStart}
          setDateRangeStart={setDateRangeStart}
          dateRangeEnd={dateRangeEnd}
          setDateRangeEnd={setDateRangeEnd}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          onAddDiaryEntry={handleAddDiaryEntry}
          onEditDiaryEntry={handleEditDiaryEntry}
          onAddSymptom={handleAddSymptom}
          onEditSymptom={handleEditSymptom}
          onAddNote={handleAddNote}
          onEditNote={handleEditNote}
          onAddDocument={handleAddDocument}
          onEditDocument={handleEditDocument}
          onRefresh={refresh}
          error={error}
          loading={loading}
        />
      </div>
      
      {/* Modals - Shared between both layouts */}
      <DiaryEntryModal
        isOpen={showDiaryEntry}
        onClose={() => setShowDiaryEntry(false)}
        profileId={id!}
        selectedDate={new Date()}
        onEntrySaved={refresh}
        editEntry={selectedDiaryEntry}
        viewOnly={selectedDiaryEntry !== null && isFreePlan}
      />

      <SymptomModal
        isOpen={showSymptomModal}
        onClose={() => setShowSymptomModal(false)}
        patientId={id!}
        symptom={selectedSymptom || undefined}
        onSuccess={refresh}
        viewOnly={selectedSymptom !== null && isFreePlan}
      />

      <NoteModal
        isOpen={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        patientId={id!}
        note={selectedNote || undefined}
        onSuccess={refresh}
        viewOnly={selectedNote !== null && isFreePlan}
      />

      <DocumentModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        patientId={id!}
        document={selectedDocument || undefined}
        onSuccess={refresh}
        viewOnly={selectedDocument !== null && isFreePlan}
      />

      <MoodEntryModal
        isOpen={showMoodModal}
        onClose={() => setShowMoodModal(false)}
        patientId={id!}
        existingEntry={todaysMood}
        onSuccess={refresh}
        viewOnly={todaysMood !== null && isFreePlan}
      />
    </>
  );
}