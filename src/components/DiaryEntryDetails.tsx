import React, { useState, useEffect } from 'react';
import { X, Calendar, Stethoscope, Pill, BookOpen, Brain, Trash2, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { DiaryEntry, PatientDocument } from '../types/database';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { DocumentDownloadButton } from './DocumentDownloadButton';

interface DiaryEntryDetailsProps {
  entry: DiaryEntry;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function DiaryEntryDetails({ entry, isOpen, onClose, onUpdate }: DiaryEntryDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [notes, setNotes] = useState(entry.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formatDate } = useUserPreferences();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      if (!entry?.id) return;
      setDocsLoading(true);
      try {
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase
          .from('patient_documents')
          .select('*')
          .eq('diary_entry_id', entry.id);
        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error('Error fetching documents for diary entry:', err);
        setDocuments([]);
      } finally {
        setDocsLoading(false);
      }
    };
    if (isOpen) fetchDocuments();
  }, [entry?.id, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClient();
      const { error: updateError } = await supabase
        .from('diary_entries')
        .update({ title, notes })
        .eq('id', entry.id);
      if (updateError) throw updateError;
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);
    try {
      const supabase = await getSupabaseClient();
      const { error: deleteError } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entry.id);
      if (deleteError) throw deleteError;
      setShowDeleteModal(false);
      onUpdate();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!isOpen) return null;

  const getIcon = () => {
    switch (entry.entry_type) {
      case 'Appointment':
        return <Calendar className="h-6 w-6 text-purple-600" />;
      case 'Diagnosis':
        return <Stethoscope className="h-6 w-6 text-purple-600" />;
      case 'Treatment':
        return <Pill className="h-6 w-6 text-purple-600" />;
      case 'AI':
        return <Brain className="h-6 w-6 text-purple-600" />;
      default:
        return <BookOpen className="h-6 w-6 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <h2 className="text-xl font-semibold text-gray-900">
              {entry.entry_type} Entry
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={8}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{entry.title}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {formatDate(entry.date)}
                </p>
              </div>

              {entry.notes && (
                <div className="prose max-w-none">
                  <p className="text-gray-600 whitespace-pre-wrap">{entry.notes}</p>
                </div>
              )}

              {entry.attendees && entry.attendees.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700">Attendees</h4>
                  <ul className="mt-2 space-y-1">
                    {entry.attendees.map((attendee, index) => (
                      <li key={index} className="text-sm text-gray-600">{attendee}</li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.severity && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700">Severity:</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {entry.severity}
                  </span>
                </div>
              )}

              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Attached Documents</h4>
                <ul className="space-y-2">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex items-center space-x-2">
                      <DocumentDownloadButton doc={doc} />
                      <span className="text-xs text-gray-400">({Math.round(doc.file_size / 1024)} KB)</span>
                    </li>
                  ))}
                  {/* Fallback: show legacy file_url if no documents and file_url exists */}
                  {documents.length === 0 && entry.file_url && (
                    <li className="flex items-center space-x-2">
                      <DocumentDownloadButton doc={{ file_url: entry.file_url, file_name: 'Download attached file' }} />
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex justify-between space-x-3">
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 border border-transparent rounded-md shadow-sm"
                >
                  <div className="flex items-center">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Entry
                  </div>
                </button>

                <div className="flex space-x-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-white border border-indigo-600 rounded-md shadow-sm hover:bg-indigo-50"
                  >
                    Edit Entry
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-down">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Confirm Deletion</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <div>
                  <p className="text-sm text-red-700 font-semibold">Warning: This action cannot be undone</p>
                  <p className="text-sm text-red-700 mt-1">
                    You are about to delete the entry "{entry.title}" from {formatDate(entry.date)}.
                    This will permanently remove all data associated with this entry.
                  </p>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-coral-500 to-coral-600 hover:from-coral-600 hover:to-coral-700 border border-transparent rounded-md shadow-sm"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
