import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Lock } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { error as logError } from '../utils/logger';
import type { Medication, MedicationStatus } from '../types/database';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { useSubscription } from '../hooks/useSubscription';

interface MedicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  medication?: Medication;
  onSuccess: () => void;
  viewOnly?: boolean;
}

export default function MedicationModal({ isOpen, onClose, patientId, medication, onSuccess, viewOnly }: MedicationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isFreePlan } = useSubscription();

  const [medicationName, setMedicationName] = useState(medication?.medication_name || '');
  const [startDate, setStartDate] = useState(medication?.start_date || '');
  const [endDate, setEndDate] = useState(medication?.end_date || '');
  const [dosage, setDosage] = useState(medication?.dosage || '');
  const [status, setStatus] = useState<MedicationStatus>(medication?.status || 'Active');
  const [prescribedBy, setPrescribedBy] = useState(medication?.prescribed_by || '');
  const [notes, setNotes] = useState(medication?.notes || '');
  const { formatDate } = useUserPreferences();
  
  // Determine if we're in view-only mode (either by prop or subscription plan)
  const isViewOnly = viewOnly || isFreePlan;

  useEffect(() => {
    if (isOpen) {
      setMedicationName(medication?.medication_name || '');
      setStartDate(medication?.start_date || '');
      setEndDate(medication?.end_date || '');
      setDosage(medication?.dosage || '');
      setStatus(medication?.status || 'Active');
      setPrescribedBy(medication?.prescribed_by || '');
      setNotes(medication?.notes || '');
      setError(null);
    }
  }, [isOpen, medication]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't allow submissions in view-only mode
    if (isViewOnly) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      if (medication) {
        // Update existing medication
        const { error: updateError } = await supabase
          .from('medications')
          .update({
            medication_name: medicationName.trim(),
            dosage: dosage.trim(),
            status: status,
            start_date: startDate,
            end_date: endDate || null,
            prescribed_by: prescribedBy.trim() || null,
            notes: notes.trim() || null
          })
          .eq('id', medication.id);
          
        if (updateError) throw updateError;
      } else {
        // Create new medication
        const { error: insertError } = await supabase
          .from('medications')
          .insert([{
            profile_id: patientId,
            medication_name: medicationName.trim(),
            dosage: dosage.trim(),
            status: status,
            start_date: startDate,
            end_date: endDate || null,
            prescribed_by: prescribedBy.trim() || null,
            notes: notes.trim() || null
          }]);
          
        if (insertError) throw insertError;
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      logError('Error saving medication:', err);
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isViewOnly ? 'Medication Details' : 
              medication ? 'Edit Medication' : 'Add New Medication'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {isViewOnly && isFreePlan && (
          <div className="bg-amber-50 p-3 mx-6 mt-4 rounded-lg border border-amber-200">
            <div className="flex items-center">
              <Lock className="h-4 w-4 text-amber-600 mr-2" />
              <p className="text-sm text-amber-800">
                Editing medications is available on paid plans.
                <a href="/settings" className="ml-1 font-medium underline">Upgrade your plan</a>
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Medication Name
            </label>
            <input
              type="text"
              value={medicationName}
              onChange={(e) => !isViewOnly && setMedicationName(e.target.value)}
              required
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => !isViewOnly && setStartDate(e.target.value)}
                required
                disabled={isViewOnly}
                className={`mt-1 block w-full rounded-md ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => !isViewOnly && setEndDate(e.target.value)}
                min={startDate}
                disabled={isViewOnly}
                className={`mt-1 block w-full rounded-md ${
                  isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Dosage
            </label>
            <input
              type="text"
              value={dosage}
              onChange={(e) => !isViewOnly && setDosage(e.target.value)}
              required
              placeholder="e.g., 5mg once daily"
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => !isViewOnly && setStatus(e.target.value as MedicationStatus)}
              required
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Prescribed By
            </label>
            <input
              type="text"
              value={prescribedBy}
              onChange={(e) => !isViewOnly && setPrescribedBy(e.target.value)}
              placeholder="Doctor's name"
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => !isViewOnly && setNotes(e.target.value)}
              rows={3}
              disabled={isViewOnly}
              className={`mt-1 block w-full rounded-md ${
                isViewOnly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
              } border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500`}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
            >
              {isViewOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isViewOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md shadow-sm hover:bg-teal-700"
              >
                {loading ? 'Saving...' : medication ? 'Update Medication' : 'Add Medication'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}