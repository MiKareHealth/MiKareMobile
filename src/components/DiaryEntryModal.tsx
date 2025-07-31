import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Upload, FileText, Calendar, Clock, Tag, User, Save, Loader2, AlertCircle, FileAudio, Info, Trash2, Lock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { usePatientData } from '../hooks/usePatientData';
import { formatDate } from '../lib/dateUtils';
import type { Patient, DiaryEntryType, DiaryEntry, PatientDocument } from '../types/database';
import { tokens, theme } from '../styles/tokens';
import { themeClasses } from '../styles/themeUtils';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { transcribeAudio } from '../lib/audioTranscription';
import { SupabaseClient } from '@supabase/supabase-js';
import { DocumentDownloadButton } from './DocumentDownloadButton';
import { useSubscription } from '../hooks/useSubscription';

interface DiaryEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  profileId: string;
  onEntrySaved: () => void;
  editEntry?: DiaryEntry | null;
  initialNotes?: string | null;
  viewOnly?: boolean;
}

const DiaryEntryModal: React.FC<DiaryEntryModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  profileId,
  onEntrySaved,
  editEntry,
  initialNotes,
  viewOnly
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState(editEntry?.title || '');
  const [notes, setNotes] = useState(editEntry?.notes || '');
  const [entryType, setEntryType] = useState<DiaryEntryType>(editEntry?.entry_type || 'Note');
  const [severity, setSeverity] = useState(editEntry?.severity || '');
  const [attendees, setAttendees] = useState<string[]>(editEntry?.attendees || []);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecordingPermission, setHasRecordingPermission] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string>('');
  const [newAttendee, setNewAttendee] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const [audioTranscriptionAvailable, setAudioTranscriptionAvailable] = useState<boolean>(true);
  const [checkingApiStatus, setCheckingApiStatus] = useState(false);
  const [apiStatusError, setApiStatusError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [isClientInitialized, setIsClientInitialized] = useState(false);
  const [date, setDate] = useState(() => {
    // Format today's date as YYYY-MM-DD
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return editEntry?.date || `${year}-${month}-${day}`;
  });
  
  const { preferences } = useUserPreferences();
  const { isFreePlan } = useSubscription();
  
  // Determine if we're in view-only mode (either by prop or subscription plan)
  const isViewOnly = viewOnly || isFreePlan;

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { patient } = usePatientData(profileId);

  const [attachedDocuments, setAttachedDocuments] = useState<PatientDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    if (editEntry) {
      setTitle(editEntry.title);
      setNotes(editEntry.notes || '');
      setEntryType(editEntry.entry_type);
      setSeverity(editEntry.severity || '');
      setAttendees(editEntry.attendees || []);
      setDate(editEntry.date || formatDate(selectedDate));
    }
  }, [editEntry, selectedDate]);

  useEffect(() => {
    // Check initial microphone permission status
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // Check if the Permissions API is supported
      if (navigator.permissions && navigator.permissions.query) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        setHasRecordingPermission(permissionStatus.state === 'granted');
        
        // Listen for permission changes
        permissionStatus.onchange = () => {
          setHasRecordingPermission(permissionStatus.state === 'granted');
          if (permissionStatus.state === 'denied') {
            setPermissionError('Microphone access has been denied. Please enable it in your browser settings.');
          } else {
            setPermissionError('');
          }
        };
      }
    } catch (error) {
      console.log('Permissions API not fully supported');
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      setPermissionError('');
      
      // Try to get user media to trigger permission request
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If successful, stop the stream immediately (we'll create a new one when recording)
      stream.getTracks().forEach(track => track.stop());
      
      setHasRecordingPermission(true);
      return true;
    } catch (error: any) {
      console.error('Microphone permission error:', error);
      
      let errorMessage = 'Unable to access microphone. ';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMessage += 'Please click the microphone icon in your browser\'s address bar and select "Allow" to enable audio recording.';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMessage += 'No microphone found. Please connect a microphone and try again.';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMessage += 'Microphone is being used by another application. Please close other applications and try again.';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMessage += 'Microphone does not meet the required specifications.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Audio recording is not supported in this browser.';
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Audio recording is blocked due to security restrictions. Please use HTTPS or localhost.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      
      setPermissionError(errorMessage);
      setHasRecordingPermission(false);
      return false;
    }
  };

  const startRecording = async () => {
    // Don't allow recording in view-only mode
    if (isViewOnly) return;
    
    try {
      setPermissionError('');
      
      // First, request permission if not already granted
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        }
      });
      
      streamRef.current = stream;

      // Check if MediaRecorder is supported
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        throw new Error('Audio recording is not supported in this browser.');
      }

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioTranscription(audioBlob);
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event.error);
        setPermissionError(`Recording error: ${event.error?.message || 'Unknown error'}`);
        stopRecording();
      };

      // Start recording
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      let errorMessage = 'Could not start recording. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone access in your browser settings and try again.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No microphone found.';
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'Microphone is being used by another application.';
      } else {
        errorMessage += error.message;
      }
      
      setPermissionError(errorMessage);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    setRecordingTime(0);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  };

  const handleAudioTranscription = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);

      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audio-transcribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Transcription failed');
      }

      const data = await response.json();
      
      if (data.transcription) {
        setNotes((prev: string) => prev ? `${prev}\n\n${data.transcription}` : data.transcription);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      setPermissionError('Failed to transcribe audio. Please try typing your notes instead.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSave = async () => {
    // Don't allow save in view-only mode
    if (isViewOnly) return;
    
    if (!title.trim()) {
      alert('Please enter a title for the diary entry.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = await getSupabaseClient();
      const entryData = {
        profile_id: profileId,
        entry_type: entryType,
        title: title.trim(),
        date: formatDate(selectedDate),
        notes: notes.trim() || null,
        severity: severity || null,
        attendees: attendees.map((a: string) => a.trim()).filter((a: string) => a),
      };

      if (editEntry) {
        const { error } = await supabase
          .from('diary_entries')
          .update(entryData)
          .eq('id', editEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('diary_entries')
          .insert([entryData]);

        if (error) throw error;
      }

      onEntrySaved();
      onClose();
      
      // Reset form
      setTitle('');
      setNotes('');
      setEntryType('Note');
      setSeverity('');
      setAttendees([]);
      setPermissionError('');
    } catch (error) {
      console.error('Error saving diary entry:', error);
      alert('Failed to save diary entry. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Initialize Supabase client
  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        const client = await getSupabaseClient();
        if (client) {
          setSupabaseClient(client);
          setIsClientInitialized(true);
        } else {
          throw new Error('Failed to initialize Supabase client');
        }
      } catch (err) {
        console.error('Error initializing Supabase client:', err);
        setError('Failed to initialize database connection. Please try refreshing the page.');
        setIsClientInitialized(false);
      }
    };

    initializeSupabase();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow submission in view-only mode
    if (isViewOnly) return;
    
    if (!supabaseClient) {
      setError("Database connection not initialized.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) throw new Error('No active session found.');

      let fileUrl = editEntry?.file_url || null;
      
      // First, upload the audio file if it exists and hasn't been uploaded yet
      if (audioFile && !audioUploaded) {
        const uploadedUrl = await uploadAudioFile();
        if (uploadedUrl) {
          fileUrl = uploadedUrl;
          setAudioUrl(uploadedUrl);
          setAudioUploaded(true);
        }
      } else if (audioUrl) {
        fileUrl = audioUrl;
      }

      // Then upload the regular file if it exists
      let uploadedFileName: string | null = null;
      let originalFileName: string | null = null;
      if (file) {
        console.log('Starting file upload process for:', file.name);
        originalFileName = file.name;
        
        // Use simple filename format like DocumentModal
        const uniqueFileName = `${profileId}/${Date.now()}-${file.name}`;
        uploadedFileName = uniqueFileName; // Store for use in database record
        
        console.log('Upload details:', {
          originalName: file.name,
          uniqueFileName,
          fileSize: file.size,
          fileType: file.type
        });
        
        // Simple upload like DocumentModal
        const { error: uploadError } = await supabaseClient.storage
          .from('patient-documents')
          .upload(uniqueFileName, file, {
            cacheControl: '3600',
            upsert: false,
            metadata: { patient_id: profileId }
          });
        
        if (uploadError) {
          console.error('Upload failed:', uploadError);
          throw uploadError;
        }
        
        console.log('File uploaded successfully to path:', uniqueFileName);
        
        const { data: { publicUrl } } = supabaseClient.storage
          .from('patient-documents')
          .getPublicUrl(uniqueFileName);
        fileUrl = publicUrl;
        
        console.log('Generated public URL:', publicUrl);
      }

      const entryData = {
        profile_id: profileId,
        entry_type: entryType,
        title: title.trim(),
        date: date.trim(), // Ensure date is trimmed
        notes: notes.trim() || null,
        severity: entryType === 'Symptom' ? severity : null,
        attendees: attendees.map((a: string) => a.trim()).filter((a: string) => a),
        file_url: fileUrl
      };

      let entryId: string | null = editEntry?.id || null;

      if (editEntry) {
        // Update existing entry
        const { error: updateError } = await supabaseClient
          .from('diary_entries')
          .update(entryData)
          .eq('id', editEntry.id);

        if (updateError) throw updateError;
      } else {
        // Create new entry
        const { data: insertData, error: insertError } = await supabaseClient
          .from('diary_entries')
          .insert([entryData])
          .select('id');

        if (insertError) throw insertError;
        
        if (insertData && insertData.length > 0) {
          entryId = insertData[0].id;
        }
      }

      // If we have successfully uploaded a regular file, add it to patient_documents
      if (file && fileUrl && entryId && uploadedFileName && originalFileName) {
        console.log('Creating database record for uploaded file:', {
          uploadedFileName,
          originalFileName,
          fileUrl,
          entryId
        });
        
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
          throw new Error('User not authenticated');
        }
        
        const documentData = {
          patient_id: profileId,
          file_name: originalFileName, // Store original name for display
          file_type: file.type,
          file_size: file.size,
          file_url: fileUrl,
          description: `Document for diary entry: ${title}`,
          uploaded_by: user.id,
          diary_entry_id: entryId,
          summary: null // Initially null
        };
        
        console.log('Inserting document record:', documentData);
        
        const { data: newDoc, error: docError } = await supabaseClient
          .from('patient_documents')
          .insert([documentData])
          .select('id')
          .single();
          
        if (docError) {
          console.error('Error adding file to documents:', docError);
        } else if (newDoc?.id) {
          console.log('Document record created successfully with ID:', newDoc.id);
          // Fire and forget the summarization function
          supabaseClient.functions.invoke('summarize-document', {
            body: { document_id: newDoc.id },
          }).then(({ error: functionError }) => {
            if (functionError) console.error('Error invoking summary function:', functionError);
          });
        }
      }

      onEntrySaved();
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    // Don't allow delete in view-only mode
    if (isViewOnly) return;
    
    if (!editEntry || !editEntry.id || !supabaseClient) return;
    
    setDeleteLoading(true);
    setError(null);
    
    try {
      const { error: deleteError } = await supabaseClient
        .from('diary_entries')
        .delete()
        .eq('id', editEntry.id);
        
      if (deleteError) throw deleteError;
      
      setShowDeleteModal(false);
      onEntrySaved();
      onClose();
    } catch (err) {
      console.error('Error deleting diary entry:', err);
      setError((err as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleAttendeeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newAttendee.trim() && !isViewOnly) {
      e.preventDefault();
      if (!attendees.includes(newAttendee.trim())) {
        setAttendees((prev) => [...prev, newAttendee.trim()]);
      }
      setNewAttendee('');
    }
  };

  const removeAttendee = (attendee: string) => {
    // Don't allow changes in view-only mode
    if (isViewOnly) return;
    setAttendees((prev) => prev.filter((a: string) => a !== attendee));
  };

  const uploadAudioFile = async () => {
    if (!audioFile || !supabaseClient) return null;
    
    try {
      setAudioUploading(true);
      setError(null);
      
      const fileExt = audioFile.name.split('.').pop();
      const fileName = `audio-${Date.now()}.${fileExt}`;
      const filePath = `${profileId}/${fileName}`;
      
      // Upload to Supabase
      const { error: uploadError, data } = await supabaseClient.storage
        .from('patient-documents')
        .upload(filePath, audioFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabaseClient.storage
        .from('patient-documents')
        .getPublicUrl(filePath);
      
      setAudioUrl(publicUrl);
      setAudioUploaded(true);
      
      return publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Error uploading audio: ${(err as Error).message}`);
      return null;
    } finally {
      setAudioUploading(false);
    }
  };

  const handleTranscribe = async () => {
    // Don't allow transcription in view-only mode
    if (isViewOnly) return;
    
    if (!audioFile) {
      setTranscriptionError('Please select an audio file first');
      return;
    }
    
    try {
      setTranscribing(true);
      setTranscriptionError(null);
      
      // Direct client-side transcription using Google Gemini
      const transcription = await transcribeAudio(audioFile);
      
      // Add transcription to notes
      if (notes) {
        setNotes(current => `${current}\n\n${transcription}`);
      } else {
        setNotes(transcription);
      }
      
    } catch (err) {
      console.error('Transcription error:', err);
      setTranscriptionError(`Error transcribing audio: ${(err as Error).message}`);
      setAudioTranscriptionAvailable(false);
    } finally {
      setTranscribing(false);
    }
  };

  // Reset form when modal opens or changes
  useEffect(() => {
    if (isOpen) {
      setEntryType(editEntry?.entry_type || 'Appointment');
      setTitle(editEntry?.title || '');
      // Only set date from entry if it exists, otherwise use today's date
      if (editEntry?.date) {
        setDate(editEntry.date);
      } else {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        setDate(`${year}-${month}-${day}`);
      }
      setNotes(editEntry?.notes || initialNotes || '');
      setSeverity(editEntry?.severity || '');
      setAttendees(editEntry?.attendees || []);
      setNewAttendee('');
      setFile(null);
      setAudioFile(null);
      setAudioUploaded(false);
      setAudioUrl(null);
      setError(null);
      setTranscriptionError(null);
      setShowDeleteModal(false);
    }
  }, [isOpen, editEntry, initialNotes]);

  // NEW: useEffect to fetch documents attached to the diary entry
  useEffect(() => {
    const fetchAttachedDocuments = async () => {
      if (!editEntry?.id || !supabaseClient) return;
      
      setDocsLoading(true);
      try {
        const { data, error } = await supabaseClient
          .from('patient_documents')
          .select('*')
          .eq('diary_entry_id', editEntry.id)
          .order('uploaded_at', { ascending: false });

        if (error) throw error;
        setAttachedDocuments(data || []);
      } catch (err) {
        console.error('Error fetching attached documents:', err);
        setAttachedDocuments([]);
      } finally {
        setDocsLoading(false);
      }
    };

    if (editEntry && isOpen) {
      fetchAttachedDocuments();
    } else {
      setAttachedDocuments([]); // Clear for new entries
    }
  }, [editEntry, isOpen, supabaseClient]);

  if (!isOpen) return null;

  // Add loading state for client initialization
  if (!isClientInitialized) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-3">
            <div className="animate-spin h-5 w-5 border-2 border-teal-500 border-t-transparent rounded-full"></div>
            <p className="text-gray-700">Initializing database connection...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-medium text-text-primary">
            {isViewOnly 
              ? 'Diary Entry Details' 
              : (editEntry ? 'Edit Diary Entry' : 'Add Diary Entry')}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors rounded-full p-1 hover:bg-background-light"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isViewOnly && isFreePlan && (
          <div className="bg-amber-50 p-3 mx-4 mt-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                Adding diary entries is available on paid plans.
                <a href="/settings" className="ml-1 font-medium underline">Upgrade your plan</a>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => !isViewOnly && setTitle(e.target.value)}
              required
              disabled={isViewOnly}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2 ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="Enter title"
            />
          </div>

          {/* Type and Date in a row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Entry Type</label>
              <select
                value={entryType}
                onChange={(e) => !isViewOnly && setEntryType(e.target.value as DiaryEntryType)}
                disabled={isViewOnly}
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2 ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              >
                <option value="Appointment">Appointment</option>
                <option value="Diagnosis">Diagnosis</option>
                <option value="Treatment">Treatment</option>
                <option value="Note">Note</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => {
                  if (!isViewOnly) {
                    const newDate = e.target.value;
                    if (newDate) {
                      setDate(newDate);
                    }
                  }
                }}
                required
                disabled={isViewOnly}
                min="1900-01-01"
                max="2100-12-31"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2 ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => !isViewOnly && setNotes(e.target.value)}
              rows={8}
              disabled={isViewOnly}
              className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2 ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="Add notes here..."
            />
          </div>

          {/* Audio Transcription Section - Only show if not view-only */}
          {!isViewOnly && (
            <div className="bg-background-light p-4 rounded-lg border border-border">
              <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center">
                <FileAudio className="h-4 w-4 mr-2" />
                Audio Transcription
              </h3>
              
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="audio-file"
                  className="px-4 py-2 inline-flex items-center text-sm font-medium rounded-md bg-background-default border border-border text-text-primary hover:bg-background-light shadow-sm cursor-pointer"
                >
                  <Mic className="h-4 w-4 mr-2" />
                  Select Audio
                </label>
                <input
                  type="file"
                  id="audio-file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAudioFile(file);
                    setAudioUploaded(false);
                    setAudioUrl(null);
                    setTranscriptionError(null);
                  }}
                  disabled={isViewOnly}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={uploadAudioFile}
                  disabled={!audioFile || audioUploading || audioUploaded || isViewOnly}
                  className={`px-4 py-2 inline-flex items-center text-sm font-medium rounded-md ${
                    !audioFile || audioUploading || audioUploaded || isViewOnly
                      ? 'bg-background-light text-text-secondary cursor-not-allowed' 
                      : 'bg-background-default border border-border text-text-primary hover:bg-background-light shadow-sm'
                  }`}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {audioUploading ? 'Uploading...' : 'Upload Audio'}
                </button>
                
                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={!audioFile || transcribing || !audioTranscriptionAvailable || isViewOnly}
                  className={`px-4 py-2 inline-flex items-center text-sm font-medium rounded-md ${
                    !audioFile || transcribing || !audioTranscriptionAvailable || isViewOnly
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm'
                  }`}
                >
                  <FileAudio className="h-4 w-4 mr-2" />
                  {transcribing ? 'Transcribing...' : 'Transcribe Now'}
                </button>
              </div>
              
              {audioFile && (
                <div className="mt-2 text-sm text-text-secondary bg-background-default p-2 rounded border border-border">
                  <p className="font-medium">Audio selected:</p>
                  <p className="truncate">{audioFile.name}</p>
                </div>
              )}
              
              {transcribing && (
                <div className="mt-2 flex items-center space-x-2 text-sm text-text-secondary">
                  <div className="animate-spin h-4 w-4 border-2 border-teal-500 border-t-transparent rounded-full"></div>
                  <span>Transcribing audio, please wait...</span>
                </div>
              )}
              
              {transcriptionError && (
                <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  <p>{transcriptionError}</p>
                </div>
              )}
            </div>
          )}

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">Attendees</label>
            {!isViewOnly ? (
              <input
                type="text"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyDown={handleAttendeeKeyDown}
                disabled={isViewOnly}
                placeholder="Type and press Enter to add"
                className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 px-4 py-2 ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            ) : null}
            
            {attendees.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attendees.map((attendee: string, index: number) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-teal-100 text-teal-800"
                  >
                    {attendee}
                    {!isViewOnly && (
                      <button
                        type="button"
                        onClick={() => removeAttendee(attendee)}
                        className="ml-1.5 inline-flex items-center justify-center text-teal-600 hover:text-teal-700"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* File Attachment */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-text-primary mb-1">Attach File</label>
            
            {/* Display attached documents and their summaries */}
            {docsLoading ? <p className="text-xs text-text-secondary">Loading documents...</p> : (
              attachedDocuments.length > 0 && (
                <ul className="mb-2 space-y-2">
                  {attachedDocuments.map((doc) => (
                    <li key={doc.id} className="flex flex-col items-start text-sm p-2 bg-gray-50 rounded-md">
                      <div className="flex items-center space-x-2">
                        <DocumentDownloadButton doc={doc} />
                        <span className="text-xs text-text-secondary">({Math.round(doc.file_size / 1024)} KB)</span>
                      </div>
                      {doc.summary ? (
                        <p className="mt-1 text-xs text-text-secondary italic pl-3 border-l-2 border-border">
                          {doc.summary}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-text-secondary italic pl-3">Summarizing...</p>
                      )}
                    </li>
                  ))}
                </ul>
              )
            )}
            
            {!isViewOnly && (
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isViewOnly}
                className={`mt-1 block w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-background-light file:text-primary hover:file:bg-background-light ${
                  isViewOnly ? 'cursor-not-allowed opacity-70' : ''
                }`}
              />
            )}
            {file && <span className="text-xs text-text-secondary ml-2">{file.name}</span>}
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-background-default border border-border rounded-md shadow-sm text-sm font-medium text-text-primary hover:bg-background-light"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-teal-500 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-teal-600"
              >
                {loading ? 'Saving...' : 'Save Entry'}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] animate-fade-down">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-text-primary">Confirm Deletion</h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors"
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
                    You are about to delete the entry "{title}" from {formatDate(selectedDate)}.
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
                className="px-4 py-2 text-sm font-medium text-text-primary bg-background-default border border-border rounded-md shadow-sm hover:bg-background-light"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 border border-transparent rounded-md shadow-sm"
              >
                {deleteLoading ? 'Deleting...' : 'Yes, Delete Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiaryEntryModal;