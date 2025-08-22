import React from 'react';
import { X, AlertTriangle, FileText, Plus, XCircle } from 'lucide-react';
import type { DiaryEntry } from '../types/database';

interface AIDuplicateWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPrevious: () => void;
  onContinue: () => void;
  aiType: string;
  previousEntry: DiaryEntry;
}

export default function AIDuplicateWarningModal({
  isOpen,
  onClose,
  onOpenPrevious,
  onContinue,
  aiType,
  previousEntry
}: AIDuplicateWarningModalProps) {
  if (!isOpen) return null;

  const getAITypeDisplayName = (type: string) => {
    switch (type) {
      case 'symptom-analysis':
        return 'Symptom Insights';
      case 'questions':
        return 'Suggested Questions';
      case 'terminology':
        return 'Medical Terms Explained';
      case 'trends':
        return 'Health Summary';
      default:
        return 'AI Analysis';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              AI Analysis Already Created
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4">
            You've already created a <strong>{getAITypeDisplayName(aiType)}</strong> entry today. 
            Would you like to:
          </p>

          <div className="space-y-3">
            <button
              onClick={onOpenPrevious}
              className="w-full flex items-center justify-center space-x-3 p-4 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors text-teal-800 font-medium"
            >
              <FileText className="h-5 w-5" />
              <span>Open Previous Entry</span>
            </button>

            <button
              onClick={onContinue}
              className="w-full flex items-center justify-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-blue-800 font-medium"
            >
              <Plus className="h-5 w-5" />
              <span>Create New Entry</span>
            </button>

            <button
              onClick={onClose}
              className="w-full flex items-center justify-center space-x-3 p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors text-gray-700 font-medium"
            >
              <XCircle className="h-5 w-5" />
              <span>Cancel</span>
            </button>
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Previous entry:</strong> {previousEntry.title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
