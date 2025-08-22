import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logConciergeEvent } from '../lib/conciergeEvents';
import { usePatientData } from './usePatientData';
import type { ChatMessage, ConciergeIntent } from '../types/database';
import { log, error as logError } from '../utils/logger';
import { detectIntent } from '../components/MeekaChat/IntentDetection';
import { MEEKA_PROMPTS } from '../components/MeekaChat/MeekaPrompts';

// Import modular hooks
import { useMeekaChatState } from './useMeekaChatState';
import { useMeekaDataCollection } from './useMeekaDataCollection';
import { useMeekaAI } from './useMeekaAI';

export function useMeekaChat() {
  const navigate = useNavigate();
  
  // Local state for processing and changes - must be declared before hooks that use them
  const [isProcessingInsertion, setIsProcessingInsertion] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Use modular state management
  const {
    messages,
    input,
    isLoading,
    isOpen,
    recentEvents,
    selectedPatientId,
    setIsLoading,
    setSelectedPatientId,
    handleInputChange,
    handleExampleClick,
    toggleChat,
    addMessage,
    updateLastMessage,
    clearInput,
    patients
  } = useMeekaChatState();

  // Use patient data
  const { patient, diaryEntries, symptoms, medications, moodEntries, refresh: refreshPatientData, refreshTable } = usePatientData(selectedPatientId);

  // Use AI integration
  const { callGeminiAPI } = useMeekaAI();

  // Use data collection
  const {
    dataCollectionMode,
    startDataCollection,
    handleDataCollectionResponse,
    handleNotesCollectionResponse
  } = useMeekaDataCollection(
    selectedPatientId,
    addMessage,
    updateLastMessage,
    setIsLoading,
    setIsProcessingInsertion,
    refreshTable,
    setHasChanges
  );

  // Refresh data when chat is closed if there were changes
  useEffect(() => {
    if (!isOpen && hasChanges) {
      log('Chat closed with changes, refreshing patient data');
      refreshPatientData();
      setHasChanges(false);
    }
  }, [isOpen, hasChanges, refreshPatientData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString()
    };

    addMessage(userMessage);
    setIsLoading(true);
    clearInput();

    try {
      // Check if we're in data collection mode
      if (dataCollectionMode?.active) {
        await handleDataCollectionResponse(userInput);
        setIsLoading(false);
        return;
      }

      // Use intent detection to determine user intent
      const intentResult = detectIntent(userInput);
      log('Intent detection result:', intentResult);

      // Handle specific intents for data collection
      if (intentResult.confidence >= 0.4) {
        switch (intentResult.intent) {
          case 'ADD_SYMPTOM':
            startDataCollection('symptoms');
            const symptomMessage: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'assistant',
              content: "I'll help you add a symptom. What's the description of the symptom?",
              timestamp: new Date().toISOString()
            };
            addMessage(symptomMessage);
            setIsLoading(false);
            return;

          case 'ADD_MEDICATION':
            startDataCollection('medications');
            const medicationMessage: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'assistant',
              content: "I'll help you add a medication. What's the name of the medication?",
              timestamp: new Date().toISOString()
            };
            addMessage(medicationMessage);
            setIsLoading(false);
            return;

          case 'ADD_MOOD':
            startDataCollection('mood_entries');
            const moodMessage: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'assistant',
              content: "I'll help you add a mood entry. What date is this for? (I'll use today if you don't specify)",
              timestamp: new Date().toISOString()
            };
            addMessage(moodMessage);
            setIsLoading(false);
            return;

          case 'ADD_NOTE':
            startDataCollection('diary_entries');
            const noteMessage: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              role: 'assistant',
              content: "I'll help you add a diary entry. What type of entry is this? (Symptom, Appointment, Diagnosis, Note, Treatment, Other, or AI)",
              timestamp: new Date().toISOString()
            };
            addMessage(noteMessage);
            setIsLoading(false);
            return;

          case 'QUERY_DATA':
            // Handle data queries with AI
            break;

          default:
            // Fall through to AI conversation
            break;
        }
      }

      // Regular AI conversation
      const currentPatient = patients.find(p => p.id === selectedPatientId);

      const patientContext = {
        patientId: selectedPatientId,
        patientName: currentPatient?.full_name,
        recentSymptoms: symptoms.slice(0, 5),
        recentMedications: medications.slice(0, 5),
        recentMoodEntries: moodEntries.slice(0, 5),
        availablePatients: patients.map(p => ({ id: p.id, name: p.full_name }))
      };

      const data = await callGeminiAPI([...messages, userMessage], patientContext);

      // Add AI response
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: data.candidates[0].content.parts[0].text,
          timestamp: new Date().toISOString()
        };
        addMessage(aiMessage);
      }

      // Log the interaction
      await logConciergeEvent(intentResult.intent, intentResult.confidence, '/chat', 'opened', {
        messageCount: messages.length + 1,
        intent: intentResult.intent,
        slots: intentResult.slots
      });

    } catch (err) {
      logError('Error in chat:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientSelection = (patientId: string) => {
    setSelectedPatientId(patientId);
    const selectedPatient = patients.find(p => p.id === patientId);
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: `Switch to ${selectedPatient?.full_name || 'this patient'}`,
      timestamp: new Date().toISOString()
    };
    addMessage(userMessage);
    handleSubmit(new Event('submit') as any);
  };

  const handleRecentActionClick = (event: any) => {
    // Map intent to user-friendly action text
    const intentToAction: Record<string, string> = {
      'ADD_SYMPTOM': 'Add a symptom',
      'ADD_MEDICATION': 'Add a medication',
      'ADD_APPOINTMENT': 'Add an appointment',
      'ADD_NOTE': 'Add a note',
      'ADD_MOOD': 'Add mood entry',
      'ADD_SLEEP': 'Add sleep entry',
      'QUERY_DATA': 'Query my health data'
    };
    
    const actionText = intentToAction[event.intent] || `Repeat my last ${event.intent.toLowerCase().replace('_', ' ')}`;
    
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: actionText,
      timestamp: new Date().toISOString()
    };
    addMessage(userMessage);
    handleSubmit(new Event('submit') as any);
  };

  return {
    // State
    messages,
    input,
    handleInputChange,
    handleSubmit,
    handleExampleClick,
    isLoading,
    isProcessingInsertion,
    error: null,
    isOpen,
    recentEvents,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    handlePatientSelection,
    handleRecentActionClick,
    toggleChat,
    dataCollectionMode,
    hasChanges
  };
}
