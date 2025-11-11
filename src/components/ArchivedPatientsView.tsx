import React from 'react';
import { usePatients } from '../contexts/PatientsContext';
import { FiArchive, FiRefreshCw, FiUser } from 'react-icons/fi';

export function ArchivedPatientsView() {
  const { archivedPatients, restorePatient, isArchivingPatient } = usePatients();

  const handleRestore = async (patientId: string, patientName: string) => {
    if (window.confirm(`Are you sure you want to restore ${patientName}?`)) {
      try {
        await restorePatient(patientId);
      } catch (error) {
        console.error('Error restoring patient:', error);
        alert('Failed to restore patient. Please try again.');
      }
    }
  };

  if (archivedPatients.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <FiArchive className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No archived patients</h3>
        <p className="mt-2 text-sm text-gray-500">
          Patients you archive will appear here and can be restored at any time.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <FiArchive className="h-5 w-5" />
          Archived Patients ({archivedPatients.length})
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          These patients have been archived and won't appear in your main patient list.
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {archivedPatients.map((patient) => (
          <div
            key={patient.id}
            className="px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {patient.photo_url ? (
                  <img
                    src={patient.photo_url}
                    alt={patient.full_name}
                    className="h-12 w-12 rounded-full object-cover opacity-60"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center opacity-60">
                    <FiUser className="h-6 w-6 text-gray-500" />
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{patient.full_name}</h3>
                  {patient.relationship && (
                    <p className="text-sm text-gray-500">{patient.relationship}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    <FiArchive className="inline h-3 w-3 mr-1" />
                    Archived
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleRestore(patient.id, patient.full_name)}
                disabled={isArchivingPatient}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiRefreshCw className={`h-4 w-4 ${isArchivingPatient ? 'animate-spin' : ''}`} />
                Restore
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
