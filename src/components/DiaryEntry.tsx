import React, { useState, useRef, useEffect } from 'react';
import { X, Calendar, Upload, Tag, AlertCircle, Mic, StopCircle } from 'lucide-react';
import type { DiaryEntryType } from '../types/database';
import { getSupabaseClient } from '../lib/supabaseClient';
import { tokens } from '../styles/tokens';
import { transcribeAudio } from '../lib/audioTranscription';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { error as logError } from '../utils/logger';

interface DiaryEntryProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  onSuccess: () => void;
}

export default function DiaryEntry({ isOpen, onClose, patientId, onSuccess }: DiaryEntryProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entryType, setEntryType] = useState<DiaryEntryType>('Appointment');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [severity, setSeverity] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribing, setTranscribing] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Reset the form when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset all state
      setEntryType('Appointment');
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setSeverity('');
      setAttendees([]);
      setNewAttendee('');
      setFile(null);
      setError(null);
      setAudioBlob(null);
      setTranscriptionError(null);
      
      // Stop recording if active
      if (isRecording) {
        stopRecording();
      }
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let fileUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${patientId}/${Date.now()}.${fileExt}`;

        const supabase = await getSupabaseClient();
        const { error: uploadError } = await supabase.storage
          .from('patient-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = await supabase.storage
          .from('patient-documents')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      const supabase = await getSupabaseClient();
      const { error: insertError } = await supabase
        .from('diary_entries')
        .insert([{
          profile_id: patientId,
          entry_type: entryType,
          title,
          date,
          notes,
          severity: entryType === 'Symptom' ? severity : null,
          attendees,
          file_url: fileUrl
        }]);

      if (insertError) throw insertError;

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAttendeeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newAttendee.trim()) {
      e.preventDefault();
      if (!attendees.includes(newAttendee.trim())) {
        setAttendees([...attendees, newAttendee.trim()]);
      }
      setNewAttendee('');
    }
  };

  const removeAttendee = (attendee: string) => {
    setAttendees(attendees.filter(a => a !== attendee));
  };

  const resetForm = () => {
    setEntryType('Appointment');
    setTitle('');
    setDate('');
    setNotes('');
    setSeverity('');
    setAttendees([]);
    setNewAttendee('');
    setFile(null);
    setError(null);
    setAudioBlob(null);
    stopRecording();
  };

  // Audio recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mpeg' });
        setAudioBlob(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      logError('Error starting recording:', err);
      setError(`Could not start recording: ${(err as Error).message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioBlob) {
      setTranscriptionError('No audio recording found to transcribe');
      return;
    }

    setTranscribing(true);
    setTranscriptionError(null);

    try {
      const supabase = await getSupabaseClient();
      const transcript = await transcribeAudio(audioBlob);
      setNotes(prev => prev ? `${prev}\n\n${transcript}` : transcript);
    } catch (err) {
      logError('Transcription error:', err);
      setTranscriptionError(`Transcription error: ${(err as Error).message}`);
    } finally {
      setTranscribing(false);
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    
    try {
      const supabase = await getSupabaseClient();
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', entry.id);
        
      if (error) throw error;
      
      onDelete();
    } catch (err) {
      logError('Error deleting diary entry:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto animate-fade-down">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className={tokens.typography.sizes.h2}>Add Diary Entry</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className={tokens.typography.sizes.label}>Entry Type</label>
            <select
              value={entryType}
              onChange={(e) => setEntryType(e.target.value as DiaryEntryType)}
              className="input-base mt-1"
            >
              <option value="Appointment">Appointment</option>
              <option value="Diagnosis">Diagnosis</option>
              <option value="Treatment">Treatment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className={tokens.typography.sizes.label}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="input-base mt-1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          {entryType === 'Symptom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select severity</option>
                <option value="Mild">Mild</option>
                <option value="Moderate">Moderate</option>
                <option value="Severe">Severe</option>
              </select>
            </div>
          )}

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <div className="flex space-x-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={startRecording}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Mic className="h-4 w-4 mr-1" />
                    Record
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 animate-pulse"
                  >
                    <StopCircle className="h-4 w-4 mr-1" />
                    Stop
                  </button>
                )}
                {audioBlob && !isRecording && (
                  <button
                    type="button"
                    onClick={handleTranscribe}
                    disabled={transcribing}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                  >
                    {transcribing ? 'Transcribing...' : 'Transcribe'}
                  </button>
                )}
              </div>
            </div>
            {audioBlob && (
              <div className="mb-2 p-2 bg-gray-50 rounded-md">
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                {transcriptionError && (
                  <p className="text-sm text-red-500 mt-1">{transcriptionError}</p>
                )}
              </div>
            )}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Attendees</label>
            <div className="mt-1">
              <input
                type="text"
                value={newAttendee}
                onChange={(e) => setNewAttendee(e.target.value)}
                onKeyDown={handleAttendeeKeyDown}
                placeholder="Type and press Enter to add"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              {attendees.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {attendees.map((attendee, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                    >
                      {attendee}
                      <button
                        type="button"
                        onClick={() => removeAttendee(attendee)}
                        className="ml-1.5 inline-flex items-center justify-center text-indigo-400 hover:text-indigo-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Attach File</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-medium
                file:bg-indigo-50 file:text-indigo-700
                hover:file:bg-indigo-100"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Saving...' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}