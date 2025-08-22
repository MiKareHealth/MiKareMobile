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
import { useFreePlanUsage } from './useFreePlanUsage';
import { useSubscription } from './useSubscription';

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

  // Use subscription and free plan usage
  const { isFreePlan } = useSubscription();
  const { diaryEntriesUsed, aiAnalysisUsed, canAddDiaryEntry, canUseAI, refresh: refreshUsage } = useFreePlanUsage();

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

  // Handle AI analysis execution
  const handleAIAnalysis = async (analysisType: string, messageText: string) => {
    try {
      if (!selectedPatientId) {
        throw new Error('No patient selected for AI analysis');
      }

      // Show initial message from Meeka
      if (messageText) {
        const initialMessage: ChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: messageText,
          timestamp: new Date().toISOString()
        };
        addMessage(initialMessage);
      }

      // Show loading message
      const loadingMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `🧠 Running ${analysisType.replace('-', ' ')} analysis...`,
        timestamp: new Date().toISOString()
      };
      addMessage(loadingMessage);

      // Import AI analysis functionality
      const { queryGemini } = await import('../lib/gemini');
      const { getSupabaseClient } = await import('../lib/supabaseClient');
      const { getCurrentRegion } = await import('../lib/regionDetection');

      // Build context for AI analysis
      const context = JSON.stringify({
        patient: {
          name: patient?.full_name,
          notes: patient?.notes,
          dob: patient?.dob,
          gender: patient?.gender,
          relationship: patient?.relationship
        },
        diaryEntries: diaryEntries.map(entry => ({
          date: entry.date,
          type: entry.entry_type,
          title: entry.title,
          notes: entry.notes,
          severity: entry.severity,
          attendees: entry.attendees
        })),
        symptoms: symptoms.map(symptom => ({
          description: symptom.description,
          startDate: symptom.start_date,
          endDate: symptom.end_date,
          severity: symptom.severity,
          notes: symptom.notes
        }))
      });

      // Determine prompt based on analysis type
      let prompt = '';
      let title = '';
      
      switch (analysisType) {
        case 'symptom-analysis':
          title = 'Symptom Insights';
          prompt = 'Analyze the symptoms and diary entries. Consider the patient\'s background information, family history, allergies, and other relevant details when available. Look for patterns, correlations between symptoms, and potential triggers. Focus on severity changes and duration patterns.';
          break;
        case 'questions':
          title = 'Suggested Questions for Next Visit';
          prompt = 'Based on the symptoms, diary entries, and patient information, suggest important questions to ask during the next medical visit. Consider the patient\'s background, family history, allergies, and cultural factors when formulating questions. Prioritize questions based on severity and recency of symptoms.';
          break;
        case 'summary':
          title = 'Health Summary';
          prompt = 'Analyze the overall health trends based on symptoms, diary entries, and patient information. Consider the patient\'s background, family history, and other relevant factors when identifying patterns. Identify any improvements or deteriorations, and highlight key patterns in health status.';
          break;
        case 'recommendations':
          title = 'Recommendations';
          prompt = 'Based on the patient\'s health data, provide general wellness recommendations. Focus on lifestyle suggestions, self-care practices, and general health maintenance. Do not provide medical advice or specific treatment recommendations.';
          break;
        default:
          throw new Error(`Unknown analysis type: ${analysisType}`);
      }

      // Get AI response
      const currentRegion = getCurrentRegion();
      const aiResponse = await queryGemini(prompt, context, currentRegion);

      // Create AI diary entry if user can use AI
      if (canUseAI || !isFreePlan) {
        const supabase = await getSupabaseClient();
        const { error: insertError } = await supabase
          .from('diary_entries')
          .insert([{
            profile_id: selectedPatientId,
            entry_type: 'AI',
            title: `AI Insights: ${title}`,
            date: new Date().toISOString().split('T')[0],
            notes: aiResponse,
            ai_type: analysisType,
            source_entries: diaryEntries.map(e => e.id)
          }]);

        if (insertError) throw insertError;

        // Refresh usage data
        refreshUsage();
        refreshTable('diary_entries');
        setHasChanges(true);
      }

      // Replace loading message with result
      const resultMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `✅ **${title} Complete**\n\n${aiResponse}${canUseAI || !isFreePlan ? '\n\n*This analysis has been saved to your diary.*' : ''}`,
        timestamp: new Date().toISOString()
      };
      
      // Update the loading message
      updateLastMessage(resultMessage);

    } catch (err) {
      logError('Error executing AI analysis:', err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `Sorry, I encountered an error while running the AI analysis: ${(err as Error).message}`,
        timestamp: new Date().toISOString()
      };
      updateLastMessage(errorMessage);
    }
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

          case 'AI_ANALYSIS':
          case 'AI_SYMPTOM_ANALYSIS':
          case 'AI_QUESTIONS':
          case 'AI_SUMMARY':
          case 'AI_RECOMMENDATIONS':
            // Handle AI analysis requests
            const analysisType = intentResult.slots?.analysisType || 
              (intentResult.intent === 'AI_SYMPTOM_ANALYSIS' ? 'symptom-analysis' :
               intentResult.intent === 'AI_QUESTIONS' ? 'questions' :
               intentResult.intent === 'AI_SUMMARY' ? 'summary' :
               intentResult.intent === 'AI_RECOMMENDATIONS' ? 'recommendations' : 'symptom-analysis');
            
            if (!selectedPatientId) {
              const noPatientMessage: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                role: 'assistant',
                content: "Please select a patient first so I can analyze their health data.",
                timestamp: new Date().toISOString()
              };
              addMessage(noPatientMessage);
              setIsLoading(false);
              return;
            }

            if (isFreePlan && !canUseAI) {
              const limitMessage: ChatMessage = {
                id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                role: 'assistant',
                content: "You've already used your free AI analysis. Upgrade to a paid plan to continue using AI features and get unlimited access to health insights.",
                timestamp: new Date().toISOString()
              };
              addMessage(limitMessage);
              setIsLoading(false);
              return;
            }

            await handleAIAnalysis(analysisType, `I'll run a ${analysisType.replace('-', ' ')} for you.`);
            setIsLoading(false);
            return;

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

      const freePlanContext = isFreePlan ? {
        diaryEntriesUsed,
        aiAnalysisUsed,
        canAddDiaryEntry,
        canUseAI
      } : null;

      const data = await callGeminiAPI([...messages, userMessage], patientContext, freePlanContext);

      // Add AI response and check for AI analysis trigger
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const responseText = data.candidates[0].content.parts[0].text;
        
        // Check if response contains AI analysis trigger
        const aiAnalysisMatch = responseText.match(/AI_ANALYSIS:(\w+)/);
        
        if (aiAnalysisMatch && selectedPatientId && (canUseAI || !isFreePlan)) {
          const analysisType = aiAnalysisMatch[1];
          
          // Execute AI analysis
          await handleAIAnalysis(analysisType, responseText.replace(/AI_ANALYSIS:\w+/, '').trim());
        } else {
          const aiMessage: ChatMessage = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            role: 'assistant',
            content: responseText,
            timestamp: new Date().toISOString()
          };
          addMessage(aiMessage);
        }
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
