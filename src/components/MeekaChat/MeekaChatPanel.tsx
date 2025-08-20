import React, { useRef, useEffect, useState } from 'react';
import { Send, Bot, User, X, Clock, ChevronDown } from 'lucide-react';
import { useMeekaChat } from '../../hooks/useMeekaChat';
import { tokens } from '../../styles/tokens';
import type { ChatMessage } from '../../types/database';

export default function MeekaChatPanel() {
  const { 
    messages, 
    input,
    handleInputChange,
    handleSubmit,
    isLoading, 
    isOpen, 
    recentEvents,
    patients,
    selectedPatientId,
    setSelectedPatientId,
    handlePatientSelection,
    handleRecentActionClick, 
    toggleChat 
  } = useMeekaChat();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input?.trim() || isLoading) return;
    
    handleSubmit(e);
  };

  const handlePatientChange = (patientId: string) => {
    setSelectedPatientId(patientId);
    setShowPatientDropdown(false);
  };

  const getSelectedPatientName = () => {
    const patient = patients.find(p => p.id === selectedPatientId);
    return patient?.full_name || 'Select Patient';
  };

  const renderMessage = (message: any) => {
    const isUser = message.role === 'user';
    
    return (
      <div
        key={message.id || Date.now()}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Avatar */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isUser 
              ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white ml-2' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 mr-2'
          }`}>
            {isUser ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
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
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.meta.patients.map((patient: any, index: number) => (
                      <button
                        key={index}
                        onClick={() => handlePatientSelection(patient.id)}
                        className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                      >
                        {patient.name}
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
  };

  return (
    <div className="fixed bottom-20 right-6 z-40 w-96 h-[500px] bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-gray-200 bg-gradient-to-r from-teal-50 to-teal-100">
        <div className="flex items-center">
          <Bot className="h-5 w-5 text-teal-600 mr-2" />
          <h3 className="font-semibold text-gray-800">Ask Meeka</h3>
        </div>
      </div>

      {/* Patient Selection Dropdown */}
      {patients.length > 1 && (
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
          <div className="relative">
            <button
              onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              className="w-full flex items-center justify-between px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              <span className="text-gray-700">{getSelectedPatientName()}</span>
              <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showPatientDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showPatientDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                {patients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handlePatientChange(patient.id)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                      patient.id === selectedPatientId ? 'bg-teal-50 text-teal-700' : 'text-gray-700'
                    }`}
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(renderMessage)}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex max-w-[80%]">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 mr-2 flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Recent Actions */}
      {recentEvents.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center text-xs text-gray-600 mb-2">
            <Clock className="h-3 w-3 mr-1" />
            Recent actions
          </div>
          <div className="flex flex-wrap gap-1">
            {recentEvents.slice(0, 3).map((event, index) => (
              <button
                key={index}
                onClick={() => handleRecentActionClick(event)}
                className="text-xs bg-white text-gray-700 px-2 py-1 rounded border hover:bg-gray-50"
              >
                {event.intent.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={input || ''}
            onChange={handleInputChange}
            placeholder="Ask Meeka anything..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input?.trim() || isLoading}
            className="px-4 py-2 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-md hover:from-teal-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
