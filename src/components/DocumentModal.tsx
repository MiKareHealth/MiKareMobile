import React, { useState, useEffect } from 'react';
import { X, FileText, Upload, AlertCircle, Lock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import type { PatientDocument } from '../types/database';
import { getSignedUrlFromFileUrl } from '../lib/fileUtils';
import { DocumentDownloadButton } from './DocumentDownloadButton';
import { useSubscription } from '../hooks/useSubscription';
import { error as logError } from '../utils/logger';

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  document?: PatientDocument;
  onSuccess: () => void;
  viewOnly?: boolean;
}

export default function DocumentModal({ isOpen, onClose, patientId, document, onSuccess, viewOnly }: DocumentModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [summary, setSummary] = useState('');
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const { isFreePlan } = useSubscription();
  
  // Determine if we're in view-only mode (either by prop or subscription plan)
  const isViewOnly = viewOnly || isFreePlan;

  // Effect to reset state when modal opens or document changes
  useEffect(() => {
    if (isOpen) {
      setDescription(document?.description || '');
      setSummary(document?.summary || '');
      setFile(null);
      setError(null);
    }
  }, [isOpen, document]);

  useEffect(() => {
    async function fetchSignedUrl() {
      if (!document?.file_url) return;
      setSignedUrl(await getSignedUrlFromFileUrl(document.file_url));
    }
    fetchSignedUrl();
  }, [document]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if in view-only mode
    if (isViewOnly) return;
    
    setLoading(true);
    setError(null);

    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      if (!file && !document) {
        throw new Error('Please select a file to upload');
      }

      let fileUrl = document?.file_url;
      let fileName = document?.file_name;
      let fileType = document?.file_type;
      let fileSize = document?.file_size;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${patientId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from('patient-documents').upload(uniqueFileName, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: { patient_id: patientId }
        });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('patient-documents').getPublicUrl(uniqueFileName);
        fileUrl = publicUrl;
        fileName = file.name;
        fileType = file.type;
        fileSize = file.size;
      }

      if (document) {
        // Update existing document description
        const { error: updateError } = await supabase
          .from('patient_documents')
          .update({ description: description || null })
          .eq('id', document.id);
        if (updateError) throw updateError;
      } else if (fileUrl && fileName && fileType && fileSize) {
        // Create new document record
        const { data: newDoc, error: insertError } = await supabase
          .from('patient_documents')
          .insert([{
            patient_id: patientId,
            file_name: fileName,
            file_type: fileType,
            file_size: fileSize,
            file_url: fileUrl,
            description: description || null,
            uploaded_by: user.id,
            summary: null // Initially null
          }])
          .select('id')
          .single();

        if (insertError) throw insertError;
        
        // Trigger summarization function
        if (newDoc?.id) {
          supabase.functions.invoke('summarize-document', {
            body: { document_id: newDoc.id },
          }).then(({ error: functionError }) => {
            if (functionError) logError('Error invoking summary function:', functionError);
          });
        }
      }

      onSuccess();
      onClose();
    } catch (err) {
      logError('Error handling document:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full mx-4 animate-fade-down">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">
            {isViewOnly ? 'Document Details' : 
              document ? 'Edit Document' : 'Upload Document'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isViewOnly && isFreePlan && (
          <div className="bg-amber-50 p-3 mx-6 mt-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                Editing documents is available on paid plans.
                <a href="/settings" className="ml-1 font-medium underline">Upgrade your plan</a>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {!document && !isViewOnly && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Document File</label>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isViewOnly}
                className={`mt-1 block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-teal-50 file:text-teal-700
                  hover:file:bg-teal-100 ${isViewOnly ? 'cursor-not-allowed opacity-70' : ''}`}
                required={!document}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => !isViewOnly && setDescription(e.target.value)}
              disabled={isViewOnly}
              rows={4}
              placeholder="Add a description of this document..."
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {document && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700">AI Summary</label>
                <div className="mt-1 p-3 w-full rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-600 min-h-[6rem]">
                  {summary ? (
                    <p className="italic">{summary}</p>
                  ) : (
                    <p className="text-gray-400">Summarizing...</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Current File</label>
                <div className="mt-1 flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <DocumentDownloadButton doc={document} />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="rounded-md bg-red-50 p-4"><p className="text-sm text-red-700">{error}</p></div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                {loading ? 'Saving...' : (document ? 'Update Description' : 'Upload Document')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}