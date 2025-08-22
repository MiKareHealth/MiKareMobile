import { useState } from 'react';
import { log, error as logError } from '../utils/logger';
import { 
  addSymptom, 
  addMedication, 
  addMoodEntry, 
  addDiaryEntry,
  getTableSchemas 
} from '../lib/meekaDataOperations';
import type { ChatMessage } from '../types/database';

export interface DataCollectionMode {
  active: boolean;
  table: string;
  collectedData: Record<string, any>;
  currentField: string;
  requiredFields: string[];
  optionalFields: string[];
  isNotesCollection?: boolean;
}

export function useMeekaDataCollection(
  selectedPatientId: string,
  addMessage: (message: ChatMessage) => void,
  updateLastMessage: (message: ChatMessage) => void,
  setIsLoading: (loading: boolean) => void,
  setIsProcessingInsertion: (processing: boolean) => void,
  refreshTable: (table: string) => Promise<void>,
  setHasChanges: (hasChanges: boolean) => void
) {
  const [dataCollectionMode, setDataCollectionMode] = useState<DataCollectionMode | null>(null);

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
    addMessage(processingMessage);
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
    updateLastMessage(aiMessage);
    
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
      addMessage(aiMessage);
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
        addMessage(aiMessage);
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

  return {
    dataCollectionMode,
    startDataCollection,
    handleDataCollectionResponse,
    handleNotesCollectionResponse
  };
}
