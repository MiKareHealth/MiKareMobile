import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';
import { X, AlertCircle, Lock } from 'lucide-react';
import type { DiaryEntry } from '../types/database';
import { useSubscription } from '../hooks/useSubscription';

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  note?: DiaryEntry;
  onSuccess: () => void;
  viewOnly?: boolean;
}

export default function NoteModal({ isOpen, onClose, patientId, note, onSuccess, viewOnly }: NoteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFreePlan } = useSubscription();

  const [title, setTitle] = useState(note?.title || '');
  const [date, setDate] = useState(note?.date || new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState(note?.notes || '');
  
  // Determine if we're in view-only mode (either by prop or subscription plan)
  const isViewOnly = viewOnly || isFreePlan;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow submission in view-only mode
    if (isViewOnly) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      if (note) {
        // Update existing note
        const { error: updateError } = await supabase
          .from('notes')
          .update({
            title: title.trim(),
            content: notes.trim(),
            date: date
          })
          .eq('id', note.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new note
        const { error: insertError } = await supabase
          .from('notes')
          .insert([{
            profile_id: patientId,
            title: title.trim(),
            content: notes.trim(),
            date: date
          }]);
          
        if (insertError) throw insertError;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      logError('Error saving note:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-fade-down-delay delay-0">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-text-primary">
            {isViewOnly ? 'Note Details' :
              note ? 'Edit Note' : 'Add New Note'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {isViewOnly && isFreePlan && (
          <div className="bg-amber-50 p-3 mx-6 mt-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                Editing notes is available on paid plans.
                <a href="/settings" className="ml-1 font-medium underline">Upgrade your plan</a>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary">
              Note Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => !isViewOnly && setTitle(e.target.value)}
              required
              disabled={isViewOnly}
              placeholder="e.g., Doctor's Visit, Test Results, Medication Change"
              className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => !isViewOnly && setDate(e.target.value)}
              required
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => !isViewOnly && setNotes(e.target.value)}
              rows={4}
              disabled={isViewOnly}
              placeholder="Write your notes here..."
              className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-primary bg-background-default border border-border-default rounded-md shadow-sm hover:bg-background-subtle"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md shadow-sm hover:bg-teal-700"
              >
                {loading ? 'Saving...' : note ? 'Update Note' : 'Add Note'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}