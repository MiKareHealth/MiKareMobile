import React, { useState } from 'react';
import { Pill } from 'lucide-react';
import type { Medication } from '../types/database';
import MedicationModal from './MedicationModal';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import SubscriptionFeatureBlock from './SubscriptionFeatureBlock';

interface MedicationListProps {
  patientId: string;
  medications: Medication[];
  onUpdate: () => void;
  isFreePlan?: boolean;
}

export default function MedicationList({ patientId, medications, onUpdate, isFreePlan = false }: MedicationListProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | undefined>();
  const { formatDate } = useUserPreferences();
  
  const activeMedications = medications.filter(med => med.status === 'Active');
  const inactiveMedications = medications.filter(med => med.status === 'Inactive');

  const handleAddClick = () => {
    if (isFreePlan) return;
    setSelectedMedication(undefined);
    setShowModal(true);
  };

  const handleEditClick = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowModal(true);
  };

  return (
    <div className="animate-fade-down-delay delay-4">
      <div className="mb-4 sm:mb-6 flex justify-end">
        <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Medication tracking">
          <button
            onClick={handleAddClick}
            className="group relative inline-flex items-center px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-xs sm:text-sm font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <Pill className="h-4 w-4 mr-1 sm:mr-2 text-white/90 group-hover:text-white transition-colors" />
            <span>Add Medication</span>
          </button>
        </SubscriptionFeatureBlock>
      </div>

      <div className="space-y-4">
        {/* Active Medications */}
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-emerald-900 mb-3 sm:mb-4 flex items-center">
            <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-emerald-600" />
            Active Medications
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            {activeMedications.map((medication) => (
              <div
                key={medication.id}
                onClick={() => handleEditClick(medication)}
                className={`p-3 sm:p-4 rounded-lg bg-white hover:bg-emerald-50/50 transition-all duration-200 shadow-sm hover:shadow-md border border-emerald-100 ${isFreePlan ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{medication.medication_name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500">{medication.dosage}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Active
                  </span>
                </div>
                
                <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <span className="ml-2 text-gray-900">
                      {formatDate(medication.start_date)}
                    </span>
                  </div>
                  {medication.prescribed_by && (
                    <div>
                      <span className="text-gray-500">Prescribed By:</span>
                      <span className="ml-2 text-gray-900">{medication.prescribed_by}</span>
                    </div>
                  )}
                </div>

                {medication.notes && (
                  <div className="mt-2 sm:mt-4">
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{medication.notes}</p>
                  </div>
                )}
              </div>
            ))}
            
            {activeMedications.length === 0 && (
              <div className="text-center py-10 sm:py-16">
                <div className="bg-gradient-to-b from-emerald-50 to-white rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <Pill className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">No active medications</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                  Keep track of current medications, dosages, and prescriptions.
                </p>
                <SubscriptionFeatureBlock isBlocked={isFreePlan} featureName="Medication tracking">
                  <button
                    onClick={handleAddClick}
                    className="mt-4 sm:mt-6 inline-flex items-center px-3 py-1.5 sm:px-4 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                  >
                    Add First Medication
                  </button>
                </SubscriptionFeatureBlock>
              </div>
            )}
          </div>
        </div>

        {/* Historical Medications */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-3 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
            <Pill className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-gray-600" />
            Medication History
          </h2>
          
          <div className="space-y-3 sm:space-y-4">
            {inactiveMedications.map((medication) => (
              <div
                key={medication.id}
                onClick={() => handleEditClick(medication)}
                className={`p-3 sm:p-4 rounded-lg bg-white hover:bg-gray-50/50 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-100 ${isFreePlan ? 'cursor-default' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      <Pill className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 line-clamp-1">{medication.medication_name}</h3>
                      <p className="text-xs sm:text-sm text-gray-500">{medication.dosage}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    Inactive
                  </span>
                </div>
                
                <div className="mt-3 sm:mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div>
                    <span className="text-gray-500">Start Date:</span>
                    <span className="ml-2 text-gray-900">
                      {formatDate(medication.start_date)}
                    </span>
                  </div>
                  {medication.end_date && (
                    <div>
                      <span className="text-gray-500">End Date:</span>
                      <span className="ml-2 text-gray-900">
                        {formatDate(medication.end_date)}
                      </span>
                    </div>
                  )}
                  {medication.prescribed_by && (
                    <div>
                      <span className="text-gray-500">Prescribed By:</span>
                      <span className="ml-2 text-gray-900">{medication.prescribed_by}</span>
                    </div>
                  )}
                </div>

                {medication.notes && (
                  <div className="mt-2 sm:mt-4">
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{medication.notes}</p>
                  </div>
                )}
              </div>
            ))}
            
            {inactiveMedications.length === 0 && (
              <div className="text-center py-10 sm:py-16">
                <div className="bg-gradient-to-b from-gray-50 to-white rounded-full w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <Pill className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">No medication history</h3>
                <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-sm mx-auto">
                  Discontinued or completed medications will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <MedicationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        patientId={patientId}
        medication={selectedMedication}
        onSuccess={() => {
          setShowModal(false);
          onUpdate();
        }}
        viewOnly={isFreePlan && selectedMedication !== undefined}
      />
    </div>
  );
}