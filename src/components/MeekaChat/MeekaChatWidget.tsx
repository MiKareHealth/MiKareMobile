import React from 'react';
import { MessageCircle, X } from 'lucide-react';
import { tokens } from '../../styles/tokens';
import MeekaChatPanel from './MeekaChatPanel';
import { useMeekaChat } from '../../hooks/useMeekaChat';

export default function MeekaChatWidget() {
  const meekaChat = useMeekaChat();

  return (
    <>
      {/* Floating Button with Hover Tooltip */}
      <div className="fixed z-50 group sm:bottom-6 sm:right-6 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-[calc(1.5rem+env(safe-area-inset-right))]">
        <button
          onClick={meekaChat.toggleChat}
          className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-200 focus:ring-2 focus:ring-teal-300 focus:ring-offset-2 transform hover:scale-105"
          aria-label="Ask Meeka"
          aria-expanded={meekaChat.isOpen}
          aria-controls="meeka-chat-panel"
        >
          {meekaChat.isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <MessageCircle className="h-6 w-6" />
          )}
        </button>
        
        {/* Hover Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap">
          Ask Meeka
          {/* Tooltip arrow */}
          <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>

      {/* Chat Panel */}
      {meekaChat.isOpen && <MeekaChatPanel id="meeka-chat-panel" meekaChat={meekaChat} />}
    </>
  );
}
