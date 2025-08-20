import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { logConciergeEvent, getRecentConciergeEvents } from '../lib/conciergeEvents';
import { usePatientData } from './usePatientData';
import { usePatients } from '../contexts/PatientsContext';
import type { ChatMessage, ConciergeIntent } from '../types/database';
import { log, error as logError } from '../utils/logger';

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
  
  const { patient, diaryEntries, symptoms, medications, moodEntries } = usePatientData(selectedPatientId || patientId || '');

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
    if (isOpen && messages.length === 0) {
      const selectedPatient = patients.find(p => p.id === selectedPatientId);
      const patientName = selectedPatient?.full_name?.split(' ')[0] || 'you';
      
      setMessages([{
        id: 'greeting',
        role: 'assistant',
        content: `Hi! I'm Meeka, your health assistant. I'm here to help ${patientName} manage their health records. What would you like to do today? I can help you:

• Add new symptoms, medications, or appointments
• Track mood and sleep
• Write notes about health
• Answer questions about health patterns
• Suggest questions for your next doctor visit

What can I help you with?`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [isOpen, messages.length, selectedPatientId, patients]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
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

    // Enhanced system prompt
    const enhancedSystemPrompt = `You are Meeka, a warm and helpful AI health assistant for MiKare. You help users manage their health records and provide guidance.

Key Guidelines:
- Be warm, clear, and non-clinical in tone
- Keep responses concise and conversational
- Focus on helping users add health data or query their records
- Don't provide medical advice or diagnoses
- Guide users to appropriate forms when they want to add data
- Help analyze patterns in their health data when they ask questions

Your capabilities:
- Help users add symptoms, medications, appointments, notes, mood, and sleep data
- Answer questions about their health history and patterns
- Provide insights about correlations between different health factors
- Suggest questions for their next medical visit

Always maintain a friendly, supportive tone while being professional about health matters.

${contextInfo}

IMPORTANT: The user has selected a specific patient (${patientContext.patientName || 'Unknown'}) from the dropdown. When they ask to add data (symptoms, medications, appointments, etc.), always assume they want to add it for this selected patient. Reference their first name when confirming actions. For example: "I'll add that symptom for ${patientContext.patientName?.split(' ')[0] || 'you'}." Only ask for patient selection if no patient is currently selected.`;

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

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Get current patient data for context
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
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.candidates[0].content.parts[0].text,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      }

      // Log the interaction
      await logConciergeEvent('CHAT_INTERACTION', 1.0, '/chat', 'opened', {
        messageCount: messages.length + 1
      });

    } catch (err) {
      logError('Error in chat:', err);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
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
      id: Date.now().toString(),
      role: 'user',
      content: `Switch to ${selectedPatient?.full_name || 'this patient'}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    handleSubmit(new Event('submit') as any);
  };

  const handleRecentActionClick = (event: any) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: `Repeat my last ${event.intent.toLowerCase().replace('_', ' ')}`,
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, userMessage]);
    handleSubmit(new Event('submit') as any);
  };

  const toggleChat = () => setIsOpen(!isOpen);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error: null,
    isOpen,
    recentEvents,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    handlePatientSelection,
    handleRecentActionClick,
    toggleChat
  };
}
