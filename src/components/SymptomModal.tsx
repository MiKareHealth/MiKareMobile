import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Lock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';
import type { Symptom } from '../types/database';
import { useSubscription } from '../hooks/useSubscription';

interface SymptomModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  symptom?: Symptom;
  onSuccess: () => void;
  viewOnly?: boolean;
}

export default function SymptomModal({ isOpen, onClose, patientId, symptom, onSuccess, viewOnly }: SymptomModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFreePlan } = useSubscription();

  const [description, setDescription] = useState(symptom?.description || '');
  const [startDate, setStartDate] = useState(symptom?.start_date || '');
  const [endDate, setEndDate] = useState(symptom?.end_date || '');
  const [severity, setSeverity] = useState<'Mild' | 'Moderate' | 'Severe'>(symptom?.severity || 'Mild');
  const [notes, setNotes] = useState(symptom?.notes || '');
  
  // Determine if we're in view-only mode (either by prop or subscription plan)
  const isViewOnly = viewOnly || isFreePlan;

  useEffect(() => {
    if (isOpen) {
      setDescription(symptom?.description || '');
      setStartDate(symptom?.start_date || '');
      setEndDate(symptom?.end_date || '');
      setSeverity(symptom?.severity || 'Mild');
      setNotes(symptom?.notes || '');
      setError(null);
    }
  }, [isOpen, symptom]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow submission in view-only mode
    if (isViewOnly) return;
    
    setLoading(true);
    setError(null);

    try {
      const supabase = await getSupabaseClient();
      
      const symptomData = {
        profile_id: patientId,
        description: description.trim(),
        start_date: startDate,
        end_date: endDate || null,
        severity,
        notes: notes.trim() || null
      };

      if (symptom) {
        // Update existing symptom
        const { error: updateError } = await supabase
          .from('symptoms')
          .update(symptomData)
          .eq('id', symptom.id);

        if (updateError) throw updateError;
      } else {
        // Create new symptom
        const { error: insertError } = await supabase
          .from('symptoms')
          .insert([symptomData]);

        if (insertError) throw insertError;
      }

      onSuccess();
      onClose();
    } catch (err) {
      logError('Error saving symptom:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setStartDate('');
    setEndDate('');
    setSeverity('Mild');
    setNotes('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 animate-fade-down-delay delay-0">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-text-primary">
            {isViewOnly ? 'Symptom Details' :
              symptom ? 'Edit Symptom' : 'Add New Symptom'}
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
                Editing symptoms is available on paid plans.
                <a href="/settings" className="ml-1 font-medium underline">Upgrade your plan</a>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-text-primary">
              Symptom Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => !isViewOnly && setDescription(e.target.value)}
              required
              disabled={isViewOnly}
              placeholder="e.g., Headache, Fever, Cough"
              className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-text-primary">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => !isViewOnly && setStartDate(e.target.value)}
                required
                disabled={isViewOnly}
                className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary">
                End Date (if resolved)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => !isViewOnly && setEndDate(e.target.value)}
                min={startDate}
                disabled={isViewOnly}
                className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Severity
            </label>
            <select
              value={severity}
              onChange={(e) => !isViewOnly && setSeverity(e.target.value as 'Mild' | 'Moderate' | 'Severe')}
              required
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            >
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => !isViewOnly && setNotes(e.target.value)}
              rows={3}
              disabled={isViewOnly}
              placeholder="Additional details, triggers, or observations about this symptom"
              className={`mt-1 block w-full rounded-md border-border-default shadow-sm focus:border-primary focus:ring-primary ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
            />
          </div>

          {error && (
            <div className="rounded-md bg-error-light p-4">
              <p className="text-sm text-error">{error}</p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-primary bg-white border border-border-default rounded-md shadow-sm hover:bg-background-subtle"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-dark"
              >
                {loading ? 'Saving...' : symptom ? 'Update Symptom' : 'Add Symptom'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}