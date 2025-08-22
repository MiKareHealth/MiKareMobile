import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getRecentConciergeEvents } from '../lib/conciergeEvents';
import { usePatients } from '../contexts/PatientsContext';
import type { ChatMessage } from '../types/database';
import { MEEKA_PROMPTS } from '../components/MeekaChat/MeekaPrompts';

export function useMeekaChatState() {
  const { id: patientId } = useParams<{ id: string }>();
  const { patients } = usePatients();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>(patientId || '');
  const greetingSetRef = useRef(false);

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
        content: MEEKA_PROMPTS.GREETING,
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

  const toggleChat = () => {
    if (isOpen) {
      // Chat is being closed, reset the greeting flag
      greetingSetRef.current = false;
    }
    setIsOpen(!isOpen);
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  const updateLastMessage = (message: ChatMessage) => {
    setMessages(prev => {
      const newMessages = [...prev];
      newMessages[newMessages.length - 1] = message;
      return newMessages;
    });
  };

  const clearInput = () => {
    setInput('');
  };

  return {
    // State
    messages,
    input,
    isLoading,
    isOpen,
    recentEvents,
    selectedPatientId,
    
    // Setters
    setIsLoading,
    setSelectedPatientId,
    
    // Handlers
    handleInputChange,
    handleExampleClick,
    toggleChat,
    addMessage,
    updateLastMessage,
    clearInput,
    
    // Data
    patients
  };
}
