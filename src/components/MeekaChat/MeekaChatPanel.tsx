import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Send, Bot, User, X, Clock, ChevronDown } from 'lucide-react';
import { useMeekaChat } from '../../hooks/useMeekaChat';
import type { ChatMessage } from '../../types/database';

interface MeekaChatPanelProps {
  id?: string;
  meekaChat?: any;
}

export default function MeekaChatPanel({ id, meekaChat }: MeekaChatPanelProps) {
  const { 
    messages, 
    input,
    handleInputChange: originalHandleInputChange,
    handleSubmit,
    handleExampleClick,
    isLoading,
    isProcessingInsertion,
    isOpen, 
    recentEvents,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    handlePatientSelection,
    handleRecentActionClick, 
    toggleChat 
  } = meekaChat || useMeekaChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recentActionsDropdownRef = useRef<HTMLDivElement>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showRecentActionsDropdown, setShowRecentActionsDropdown] = useState(false);

  // Helper to get selected patient label
  const getSelectedPatientLabel = useCallback(() => {
    const patient = patients.find(p => p.id === selectedPatientId);
    return patient?.full_name || 'Select Patient';
  }, [patients, selectedPatientId]);

  // Check if send should be disabled
  const isSendDisabled = useMemo(() => {
    const hasInput = input?.trim();
    const hasMultiplePatients = patients.length > 1;
    const hasSelectedPatient = selectedPatientId;
    return !hasInput || isLoading || isProcessingInsertion || (hasMultiplePatients && !hasSelectedPatient);
  }, [input, isLoading, isProcessingInsertion, patients.length, selectedPatientId]);

  // Get send button tooltip
  const getSendButtonTooltip = useMemo(() => {
    if (isProcessingInsertion) {
      return 'Processing your request...';
    }
    if (patients.length > 1 && !selectedPatientId) {
      return 'Please select a patient first';
    }
    if (!input?.trim()) {
      return 'Enter a message to send';
    }
    return 'Send message';
  }, [patients.length, selectedPatientId, input, isProcessingInsertion]);

  // Auto-scroll to bottom with reduced motion support
  useEffect(() => {
    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches 
      ? 'auto' 
      : 'smooth';
    messagesEndRef.current?.scrollIntoView({ behavior: scrollBehavior });
  }, [messages]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Maintain focus after AI responses
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      // Focus the textarea after a short delay to ensure the message is rendered
      const timer = setTimeout(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading]);

  // Enhanced input change handler with focus management
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Call the original handler
    originalHandleInputChange(e);
    
    // Ensure focus is maintained
    if (textareaRef.current && document.activeElement !== textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  // Handle click outside dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
      if (recentActionsDropdownRef.current && !recentActionsDropdownRef.current.contains(event.target as Node)) {
        setShowRecentActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation for dropdown
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowPatientDropdown(false);
    }
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSendDisabled) return;
    
    handleSubmit(e);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSendDisabled) {
        handleSubmit(e);
      }
    }
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowPatientDropdown(false);
  };

  // Format recent action text
  const formatRecentAction = useCallback((action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }, []);

    // Memoized message renderer for performance
  const renderMessage = useCallback((message: any, index: number) => {
    const isUser = message.role === 'user';
    const messageKey = message.id || `message-${index}`;
    

    
    return (
      <div
        key={messageKey}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
        role="listitem"
      >
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div 
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              isUser 
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white ml-2' 
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 mr-2'
            }`}
            aria-label={isUser ? 'User message' : 'Meeka response'}
          >
            {isUser ? (
              <User className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Bot className="h-4 w-4" aria-hidden="true" />
            )}
          </div>

          {/* Message Content */}
          <div className={`rounded-lg px-4 py-2 ${
            isUser
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}>
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            
            {/* Meta information */}
            {message.meta && (
              <div className="mt-2">
                {message.meta.type === 'patient_selection' && (
                  <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Patient selection options">
                    {message.meta.patients.map((patient: any, index: number) => (
                      <button
                        key={patient.id || index}
                        onClick={() => handlePatientSelection(patient.id)}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
                        aria-label={`Select ${patient.name}`}
                      >
                        {patient.name}
                      </button>
                    ))}
                  </div>
                )}
                {message.meta.type === 'greeting_with_examples' && (
                  <div className="flex flex-wrap gap-2 mt-3" role="group" aria-label="Example prompts">
                    {message.meta.examples.map((example: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs bg-teal-50 text-teal-700 px-3 py-2 rounded-md hover:bg-teal-100 focus:outline-none focus:ring-2 focus:ring-teal-300 border border-teal-200 transition-colors"
                        aria-label={`Use example: ${example}`}
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [handlePatientSelection, handleExampleClick]);

  return (
    <div 
      id={id}
      className="fixed bottom-20 right-6 z-40 w-96 h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
      role="dialog"
      aria-label="Chat with Meeka"
      aria-modal="true"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-100">
        <div className="flex items-center">
          <Bot className="h-5 w-5 text-teal-600 mr-2" aria-hidden="true" />
          <h3 className="font-semibold text-gray-800">Ask Meeka</h3>
        </div>
        
        {/* Recent Actions Dropdown */}
        {recentEvents.length > 0 && (
          <div className="relative" ref={recentActionsDropdownRef}>
            <button
              onClick={() => setShowRecentActionsDropdown(!showRecentActionsDropdown)}
              onKeyDown={handleDropdownKeyDown}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-teal-300"
              aria-label="Recent actions"
              title="Recent actions"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
            </button>
            
            {showRecentActionsDropdown && (
              <div 
                className="absolute top-full right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 min-w-48 max-h-40 overflow-y-auto"
                role="menu"
                aria-label="Recent actions"
              >
                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-200">
                  Recent Actions
                </div>
                {recentEvents.slice(0, 5).map((event, index) => (
                  <button
                    key={`${event.intent}-${index}`}
                    onClick={() => {
                      handleRecentActionClick(event);
                      setShowRecentActionsDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-300 border-b border-gray-100 last:border-b-0"
                    role="menuitem"
                  >
                    {formatRecentAction(event.intent)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Selection Dropdown */}
      {patients.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              onKeyDown={handleDropdownKeyDown}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
              aria-haspopup="listbox"
              aria-expanded={showPatientDropdown}
              aria-label={`Selected patient: ${getSelectedPatientLabel()}`}
            >
              <span className="text-gray-700">{getSelectedPatientLabel()}</span>
              <ChevronDown 
                className={`h-4 w-4 text-gray-500 transition-transform ${showPatientDropdown ? 'rotate-180' : ''}`} 
                aria-hidden="true" 
              />
            </button>
            
            {showPatientDropdown && (
              <div 
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto"
                role="listbox"
                aria-label="Patient selection"
              >
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientChange(patient.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-300 ${
                      patient.id === selectedPatientId ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                    }`}
                    role="option"
                    aria-selected={patient.id === selectedPatientId}
                  >
                    {patient.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
        aria-atomic="false"
      >
        
        

        
        {messages.map((message, index) => renderMessage(message, index))}
        

        
        {(isLoading || isProcessingInsertion) && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 mr-2 flex items-center justify-center">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1" aria-label={isProcessingInsertion ? "Processing your request..." : "Meeka is typing"}>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  {isProcessingInsertion && (
                    <span className="text-xs text-gray-600">Updating records...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>



      {/* Input */}
      <form onSubmit={onSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <textarea
            ref={textareaRef}
            value={input || ''}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={patients.length > 1 && !selectedPatientId ? "Select a patient first..." : "Ask Meeka anything..."}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent resize-none"
            rows={1}
            disabled={isLoading || isProcessingInsertion}
            aria-label="Message input"
            aria-describedby={patients.length > 1 && !selectedPatientId ? "patient-required-message" : undefined}
            autoFocus
          />
          <button
            type="submit"
            disabled={isSendDisabled}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-md hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-300"
            aria-label={getSendButtonTooltip}
            title={getSendButtonTooltip}
          >
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {patients.length > 1 && !selectedPatientId && (
          <div id="patient-required-message" className="text-xs text-red-600 mt-1">
            Please select a person to continue
          </div>
        )}
      </form>
    </div>
  );
}
