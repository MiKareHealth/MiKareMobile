import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logConciergeEvent, getRecentConciergeEvents } from '../lib/conciergeEvents';
import { usePatientData } from './usePatientData';
import { usePatients } from '../contexts/PatientsContext';
import type { ChatMessage, ConciergeIntent } from '../types/database';
import { log, error as logError } from '../utils/logger';
import { 
  addSymptom, 
  addMedication, 
  addMoodEntry, 
  addDiaryEntry, 
  addPatientDocument,
  getTableSchemas 
} from '../lib/meekaDataOperations';

export function useMeekaChat() {
  const navigate = useNavigate();
  const { id: patientId } = useParams<{ id: string }>();
  const { patients } = usePatients();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  const greetingSetRef = useRef(false);
  
  // Data collection state
  const [dataCollectionMode, setDataCollectionMode] = useState<{
    active: boolean;
    table: string;
    collectedData: Record<string, any>;
    currentField: string;
    requiredFields: string[];
    optionalFields: string[];
    isNotesCollection?: boolean;
  } | null>(null);
  
  const { patient, diaryEntries, symptoms, medications, moodEntries, refresh: refreshPatientData, refreshTable } = usePatientData(selectedPatientId || patientId || '');

  // Update selected patient when patientId changes
  useEffect(() => {
    if (patientId) {
      setSelectedPatientId(patientId);
    } else if (patients.length === 1) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patientId, patients]);

  // Load recent events on mount
  useEffect(() => {
    const loadData = async () => {
      const events = await getRecentConciergeEvents(10);
      setRecentEvents(events);
    };
    loadData();
  }, []);

  // Initialize chat with greeting when opened
  useEffect(() => {
    if (isOpen && !greetingSetRef.current) {
      const greetingMessage: ChatMessage = {
        id: 'greeting',
        role: 'assistant' as const,
        content: `Hi! I'm Meeka, your health assistant. I'm here to help you manage your health records.

What can I help you with?`,
        meta: {
          type: 'greeting_with_examples',
          examples: [
            'Add a symptom',
            'Add a medication', 
            'Add a mood entry'
          ]
        },
        timestamp: new Date().toISOString()
      };
      
      setMessages([greetingMessage]);
      greetingSetRef.current = true;
    }
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleExampleClick = (example: string) => {
    setInput(example);
  };

  // Start data collection mode
  const startDataCollection = (table: string) => {
    const schemas = getTableSchemas();
    const schema = schemas[table as keyof typeof schemas];
    
    if (!schema) {
      logError('Unknown table for data collection:', table);
      return;
    }

    setDataCollectionMode({
      active: true,
      table,
      collectedData: {},
      currentField: schema.required[0],
      requiredFields: schema.required,
      optionalFields: schema.optional,
      isNotesCollection: false
    });
  };

  // Handle data collection response
  const handleDataCollectionResponse = async (userInput: string) => {
    if (!dataCollectionMode || !selectedPatientId) {
      log('Data collection response called but no mode or patient selected:', { dataCollectionMode, selectedPatientId });
      return;
    }

    const { table, collectedData, currentField, requiredFields, optionalFields, isNotesCollection } = dataCollectionMode;
    
    log('Processing data collection response:', { table, currentField, userInput, collectedData, isNotesCollection });
    
    if (isNotesCollection) {
      // Handle notes collection
      await handleNotesCollectionResponse(userInput);
      return;
    }
    
    // Add the current field value
    const updatedData = { ...collectedData, [currentField]: userInput };
    
    log('Updated collected data:', updatedData);
    
    // Find next required field
    const currentIndex = requiredFields.indexOf(currentField);
    const nextRequiredField = requiredFields[currentIndex + 1];
    
    log('Field collection progress:', { currentField, currentIndex, nextRequiredField, totalRequired: requiredFields.length });
    
    if (nextRequiredField) {
      // More required fields to collect
      setDataCollectionMode({
        ...dataCollectionMode,
        collectedData: updatedData,
        currentField: nextRequiredField
      });
      
      // Ask for next field
      const fieldPrompt = getFieldPrompt(table, nextRequiredField);
      const aiMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: fieldPrompt,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, aiMessage]);
    } else {
      // All required fields collected, check if we should ask for notes
      const hasNotesField = ['symptoms', 'medications', 'mood_entries', 'diary_entries'].includes(table);
      const notesNotCollected = !updatedData.notes && hasNotesField;
      
      if (notesNotCollected) {
        // Ask for notes before inserting
        setDataCollectionMode({
          ...dataCollectionMode,
          collectedData: updatedData,
          currentField: 'notes',
          isNotesCollection: true
        });
        
        const notesPrompt = getNotesPrompt(table);
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: notesPrompt,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        // No notes field or notes already collected, proceed with insertion
        await performDatabaseInsertion(table, updatedData);
      }
    }
  };

  // Handle notes collection response
  const handleNotesCollectionResponse = async (userInput: string) => {
    if (!dataCollectionMode || !selectedPatientId) {
      log('Notes collection response called but no mode or patient selected');
      return;
    }

    const { table, collectedData } = dataCollectionMode;
    
    log('Processing notes collection response:', { table, userInput });
    
    // Check if user declined to add notes
    const lowerInput = userInput.toLowerCase().trim();
    const declinedNotes = ['no', 'nope', 'none', 'nothing', 'n/a', 'not really', 'skip', 'no thanks', 'no thank you'].includes(lowerInput);
    
    // Add notes to collected data (empty string if declined)
    const finalData = { ...collectedData, notes: declinedNotes ? null : userInput };
    
    // Proceed with database insertion
    await performDatabaseInsertion(table, finalData);
  };

  // Perform database insertion (extracted for reuse)
  const performDatabaseInsertion = async (table: string, data: Record<string, any>) => {
    log('All required fields collected, inserting into database:', { table, data });
    setDataCollectionMode(null);
    
    // Show processing message immediately
    const processingMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: 'Processing your request...',
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, processingMessage]);
    setIsProcessingInsertion(true);
    
    const result = await insertDataToDatabase(table, data);
    
    log('Database insertion result:', result);
    
    // Replace processing message with result
    const aiMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: result.message,
      timestamp: new Date().toISOString()
    };
    
    // Replace the last message (processing message) with the result
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = aiMessage;
      return newMessages;
    });
    
    // If successful, wait 500ms then refresh data
    if (result.success) {
      log('Scheduling delayed refresh after successful insertion');
      setTimeout(async () => {
        try {
          log('Executing targeted refresh for table:', table);
          
          // Use targeted refresh for the specific table
          await refreshTable(table);
          
          // Also dispatch event for any components listening
          const refreshEvent = new CustomEvent('meekaDataUpdate', { 
            detail: { 
              table, 
              action: 'insert', 
              patientId: selectedPatientId,
              timestamp: Date.now()
            } 
          });
          window.dispatchEvent(refreshEvent);
          
          setHasChanges(true);
          log('Targeted refresh completed successfully');
        } catch (error) {
          logError('Error during targeted refresh:', error);
        } finally {
          setIsProcessingInsertion(false);
        }
      }, 500);
    } else {
      setIsProcessingInsertion(false);
    }
  };

  // Get field prompt for data collection
  const getFieldPrompt = (table: string, field: string): string => {
    const fieldPrompts: Record<string, Record<string, string>> = {
      symptoms: {
        description: "What's the description of the symptom?",
        start_date: "When did the symptom start? (I'll use today if you don't specify)",
        severity: "How severe is it? (Mild, Moderate, or Severe)",
        end_date: "When did the symptom end? (optional)",
        notes: "Any additional notes? (optional)"
      },
      medications: {
        medication_name: "What's the name of the medication?",
        start_date: "When did you start taking it? (I'll use today if you don't specify)",
        dosage: "What's the dosage?",
        status: "Is it Active or Inactive?",
        end_date: "When did you stop taking it? (optional)",
        prescribed_by: "Who prescribed it? (optional)",
        notes: "Any additional notes? (optional)"
      },
      mood_entries: {
        date: "What date is this mood entry for? (I'll use today if you don't specify)",
        body: "Rate your physical well-being from 1-5 (1=poor, 5=excellent)",
        mind: "Rate your mental well-being from 1-5 (1=poor, 5=excellent)",
        sleep: "Rate your sleep quality from 1-5 (1=poor, 5=excellent)",
        mood: "Rate your overall mood from 1-5 (1=poor, 5=excellent)",
        notes: "Any additional notes? (optional)"
      },
      diary_entries: {
        entry_type: "What type of entry? (Symptom, Appointment, Diagnosis, Note, Treatment, Other, or AI)",
        title: "What's the title of this entry?",
        date: "What date is this for? (I'll use today if you don't specify)",
        notes: "Any detailed notes? (optional)",
        severity: "What's the severity level? (optional)",
        attendees: "Who was present? (optional, separate names with commas)"
      }
    };

    return fieldPrompts[table]?.[field] || `What's the ${field}?`;
  };

  // Get notes prompt for different table types
  const getNotesPrompt = (table: string): string => {
    const notesPrompts: Record<string, string> = {
      symptoms: "Is there anything else you'd like to add about this symptom? (e.g., triggers, patterns, related symptoms, or any other details)",
      medications: "Is there anything else you'd like to add about this medication? (e.g., side effects, effectiveness, or any other details)",
      mood_entries: "Is there anything else you'd like to add about your mood today? (e.g., what influenced your mood, activities, or any other details)",
      diary_entries: "Is there anything else you'd like to add to this entry? (e.g., additional context, follow-up actions, or any other details)"
    };

    return notesPrompts[table] || "Is there anything else you'd like to add?";
  };

  // Insert data to database
  const insertDataToDatabase = async (table: string, data: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    log('insertDataToDatabase called:', { table, data, selectedPatientId });
    
    if (!selectedPatientId) {
      log('No patient selected for database insertion');
      return { success: false, message: "No patient selected. Please select a patient first." };
    }

    try {
      let result;
      
      switch (table) {
        case 'symptoms':
          log('Calling addSymptom with data:', data);
          result = await addSymptom(selectedPatientId, {
            description: data.description,
            startDate: data.start_date || new Date().toISOString().split('T')[0],
            endDate: data.end_date,
            severity: data.severity,
            notes: data.notes
          });
          break;
          
        case 'medications':
          log('Calling addMedication with data:', data);
          result = await addMedication(selectedPatientId, {
            medicationName: data.medication_name,
            startDate: data.start_date || new Date().toISOString().split('T')[0],
            endDate: data.end_date,
            dosage: data.dosage,
            status: data.status,
            prescribedBy: data.prescribed_by,
            notes: data.notes
          });
          break;
          
        case 'mood_entries':
          log('Calling addMoodEntry with data:', data);
          result = await addMoodEntry(selectedPatientId, {
            date: data.date || new Date().toISOString().split('T')[0],
            body: parseInt(data.body),
            mind: parseInt(data.mind),
            sleep: parseInt(data.sleep),
            mood: parseInt(data.mood),
            notes: data.notes
          });
          break;
          
        case 'diary_entries':
          log('Calling addDiaryEntry with data:', data);
          result = await addDiaryEntry(selectedPatientId, {
            entryType: data.entry_type,
            title: data.title,
            date: data.date || new Date().toISOString().split('T')[0],
            notes: data.notes,
            severity: data.severity,
            attendees: data.attendees ? data.attendees.split(',').map((s: string) => s.trim()) : []
          });
          break;
          
        default:
          log('Unknown table for insertion:', table);
          return { success: false, message: `Unknown table: ${table}` };
      }
      
      log('Database operation result:', result);
      return { success: result.success, message: result.message };
    } catch (err) {
      logError('Error inserting data via Meeka:', err);
      return { success: false, message: `Failed to add ${table} record: ${(err as Error).message}` };
    }
  };

  const callGeminiAPI = async (messages: any[], patientContext: any) => {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('Google API key not configured');
    }

    // Build context with patient information
    const contextInfo = patientContext ? `
Current Patient Context:
- Patient ID: ${patientContext.patientId || 'Not specified'}
- Patient Name: ${patientContext.patientName || 'Not specified'}
- Recent Symptoms: ${patientContext.recentSymptoms?.map((s: any) => s.description).join(', ') || 'None'}
- Recent Medications: ${patientContext.recentMedications?.map((m: any) => m.medication_name).join(', ') || 'None'}
- Recent Mood Entries: ${patientContext.recentMoodEntries?.length || 0} entries
- Available Patients: ${patientContext.availablePatients?.map((p: any) => p.name).join(', ') || 'None'}
` : 'No patient context provided.';

    // Get table schemas for AI context
    const tableSchemas = getTableSchemas();
    
    // Enhanced system prompt with database capabilities
    const enhancedSystemPrompt = `You are Meeka, a warm and helpful AI health assistant for MiKare. You help users manage their health records and provide guidance.

Key Guidelines:
- Be warm, clear, and non-clinical in tone
- Keep responses concise and conversational
- Focus on helping users add health data or query their records
- Don't provide medical advice or diagnoses
- Help analyze patterns in their health data when they ask questions

Your capabilities:
- Add records to the database for symptoms, medications, mood entries, diary entries, and patient documents
- Answer questions about their health history and patterns
- Provide insights about correlations between different health factors
- Suggest questions for their next medical visit

DATABASE CAPABILITIES:
You can add records to these tables with the following fields:

SYMPTOMS TABLE:
- Required: description (text), start_date (date), severity (Mild/Moderate/Severe)
- Optional: end_date (date), notes (text)

MEDICATIONS TABLE:
- Required: medication_name (text), start_date (date), dosage (text), status (Active/Inactive)
- Optional: end_date (date), prescribed_by (text), notes (text)

MOOD_ENTRIES TABLE:
- Required: date (date), body (1-5), mind (1-5), sleep (1-5), mood (1-5)
- Optional: notes (text)

DIARY_ENTRIES TABLE:
- Required: entry_type (Symptom/Appointment/Diagnosis/Note/Treatment/Other/AI), title (text), date (date)
- Optional: notes (text), severity (text), attendees (array)

PATIENT_DOCUMENTS TABLE:
- Required: file_name (text), file_type (text), file_size (integer), file_url (text)
- Optional: description (text)

When a user wants to add data, ask for the required fields one by one in a conversational way. Use today's date as default for date fields unless specified otherwise.

Always maintain a friendly, supportive tone while being professional about health matters.

${contextInfo}

IMPORTANT: The user has selected a specific patient (${patientContext.patientName || 'Unknown'}) from the dropdown. When they ask to add data, always assume they want to add it for this selected patient. Reference their first name when confirming actions. For example: "I'll add that symptom for ${patientContext.patientName?.split(' ')[0] || 'you'}." Only ask for patient selection if no patient is currently selected.`;

    // Prepare messages for Gemini
    const geminiMessages = [
      {
        role: "user",
        parts: [{ text: enhancedSystemPrompt }]
      },
      ...messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    ];

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: geminiMessages,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1000,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  };

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

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Check if we're in data collection mode
      if (dataCollectionMode?.active) {
        await handleDataCollectionResponse(userInput);
        setIsLoading(false);
        return;
      }

      // Check for data addition intent
      const lowerInput = userInput.toLowerCase();
      if (lowerInput.includes('add symptom') || lowerInput.includes('new symptom') || lowerInput.includes('symptom')) {
        startDataCollection('symptoms');
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: "I'll help you add a symptom. What's the description of the symptom?",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
      }

      if (lowerInput.includes('add medication') || lowerInput.includes('new medication') || lowerInput.includes('medication')) {
        startDataCollection('medications');
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: "I'll help you add a medication. What's the name of the medication?",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
      }

      if (lowerInput.includes('add mood') || lowerInput.includes('mood entry') || lowerInput.includes('track mood')) {
        startDataCollection('mood_entries');
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: "I'll help you add a mood entry. What date is this for? (I'll use today if you don't specify)",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
      }

      if (lowerInput.includes('add diary') || lowerInput.includes('diary entry') || lowerInput.includes('note')) {
        startDataCollection('diary_entries');
        const aiMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: "I'll help you add a diary entry. What type of entry is this? (Symptom, Appointment, Diagnosis, Note, Treatment, Other, or AI)",
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsLoading(false);
        return;
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
        setMessages(prev => [...prev, aiMessage]);
      }

      // Log the interaction
      await logConciergeEvent('ADD_NOTE' as ConciergeIntent, 1.0, '/chat', 'opened', {
        messageCount: messages.length + 1
      });

    } catch (err) {
      logError('Error in chat:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
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
    setMessages(prev => [...prev, userMessage]);
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
    setMessages(prev => [...prev, userMessage]);
    handleSubmit(new Event('submit') as any);
  };

  const toggleChat = () => {
    if (isOpen) {
      // Chat is being closed, reset the greeting flag
      greetingSetRef.current = false;
    }
    setIsOpen(!isOpen);
  };

  // Track if we've made changes that need a refresh
  const [hasChanges, setHasChanges] = useState(false);
  
  // Loading state for post-insertion processing
  const [isProcessingInsertion, setIsProcessingInsertion] = useState(false);

  // Refresh data when chat is closed if there were changes
  useEffect(() => {
    if (!isOpen && hasChanges) {
      log('Chat closed with changes, refreshing patient data');
      refreshPatientData();
      setHasChanges(false);
    }
  }, [isOpen, hasChanges, refreshPatientData]);

  return {
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
