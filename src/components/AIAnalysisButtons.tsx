import React, { useState } from 'react';
import { Brain, Loader } from 'lucide-react';
import { getSupabaseClient } from '../lib/supabaseClient';
import { queryGemini } from '../lib/gemini';
import type { DiaryEntry, Symptom } from '../types/database';
import { error as logError } from '../utils/logger';

interface AIAnalysisButtonsProps {
  patientId: string;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  onSuccess: () => void;
  autoCreate?: boolean; // Added to control behavior
}

export default function AIAnalysisButtons({
  patientId, 
  diaryEntries, 
  symptoms, 
  onSuccess,
  autoCreate = true // Default to true for backward compatibility
}: AIAnalysisButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{[key: string]: string} | null>(null);

  const handleAnalysis = async (type: string) => {
    setLoading(type);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const supabase = await getSupabaseClient();
      
      const context = JSON.stringify({
        diaryEntries: diaryEntries.map(e => ({
          type: e.entry_type,
          title: e.title,
          date: e.date,
          notes: e.notes,
          severity: e.severity
        })),
        symptoms: symptoms.map(s => ({
          description: s.description,
          startDate: s.start_date,
          endDate: s.end_date,
          severity: s.severity,
          notes: s.notes
        }))
      });

      let prompt = '';
      let title = '';

      switch (type) {
        case 'symptom-analysis':
          title = 'Symptom Insights';
          prompt = 'Analyze the symptoms and diary entries. Look for patterns, correlations between symptoms, and potential triggers. Focus on severity changes and duration patterns.';
          break;
        case 'questions':
          title = 'Suggested Questions for Next Visit';
          prompt = 'Based on the symptoms and diary entries, suggest important questions to ask during the next medical visit. Prioritize questions based on severity and recency of symptoms.';
          break;
        case 'terminology':
          title = 'Medical Terminology Explanation';
          prompt = 'Identify and explain any medical terminology found in the diary entries and symptoms. Provide clear, patient-friendly explanations.';
          break;
        case 'trends':
          title = 'Health Trend Analysis';
          prompt = 'Analyze the overall health trends based on symptoms and diary entries. Identify any improvements or deteriorations, and highlight key patterns in health status.';
          break;
      }

      // Get AI response
      const aiResponse = await queryGemini(prompt, context);
      
      // Store the analysis result in state for viewing
      setAnalysisResult({
        ...analysisResult,
        [type]: aiResponse,
      });
      
      // Create AI analysis entry if autoCreate is enabled
      if (autoCreate) {
        const { error: insertError } = await supabase
          .from('diary_entries')
          .insert([{
            profile_id: patientId,
            entry_type: 'AI',
            title: `AI Insights: ${title}`,
            date: new Date().toISOString().split('T')[0],
            notes: aiResponse,
            ai_type: type,
            source_entries: diaryEntries.map(e => e.id)
          }]);

        if (insertError) throw insertError;
      }
      
      // Show success message
      const message = autoCreate 
        ? `${title} has been added to the diary` 
        : `${title} generated successfully`;
      
      setSuccessMessage(message);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Notify parent component to refresh data
      onSuccess();
      
    } catch (err) {
      logError('AI Analysis error:', err);
      setError((err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="p-2 sm:p-4 mb-2 sm:mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs sm:text-sm">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="p-2 sm:p-4 mb-2 sm:mb-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs sm:text-sm flex items-center">
          <svg className="w-3 h-3 sm:w-5 sm:h-5 mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
          {successMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-4">
        <button
          onClick={() => handleAnalysis('symptom-analysis')}
          disabled={!!loading || !autoCreate}
          className="flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-indigo-50 via-purple-50/50 to-indigo-50/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <div className="text-center">
            <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-indigo-600 mx-auto mb-1" />
            <h3 className="text-xs sm:text-sm font-medium text-indigo-900">
              {loading === 'symptom-insights' ? 'Analysing...' : 'Symptom Insights'}
            </h3>
          </div>
        </button>

        <button
          onClick={() => handleAnalysis('questions')}
          disabled={!!loading || !autoCreate}
          className="flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <div className="text-center">
            <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-600 mx-auto mb-1" />
            <h3 className="text-xs sm:text-sm font-medium text-emerald-900">
              {loading === 'questions' ? 'Generating...' : 'Suggest Questions'}
            </h3>
          </div>
        </button>

        <button
          onClick={() => handleAnalysis('terminology')}
          disabled={!!loading || !autoCreate}
          className="flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-blue-50 via-sky-50/50 to-blue-50/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <div className="text-center">
            <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600 mx-auto mb-1" />
            <h3 className="text-xs sm:text-sm font-medium text-blue-900">
              {loading === 'terminology' ? 'Explaining...' : 'Explain Terms'}
            </h3>
          </div>
        </button>

        <button
          onClick={() => handleAnalysis('trends')}
          disabled={!!loading || !autoCreate}
          className="flex items-center justify-center p-2 sm:p-4 bg-gradient-to-br from-amber-50 via-yellow-50/50 to-amber-50/30 rounded-lg shadow-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          <div className="text-center">
            <Brain className="h-4 w-4 sm:h-6 sm:w-6 text-amber-600 mx-auto mb-1" />
            <h3 className="text-xs sm:text-sm font-medium text-amber-900">
              {loading === 'trends' ? 'Analyzing...' : 'Health Summary'}
            </h3>
          </div>
        </button>
      </div>
      
      {/* Display analysis results for free plan users */}
      {!autoCreate && analysisResult && Object.keys(analysisResult).length > 0 && (
        <>
          {!loading && (
            <div className="mt-4 space-y-4">
              {Object.entries(analysisResult).map(([type, result]) => (
                <div key={type} className="p-4 bg-white/80 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {type === 'symptom-analysis' ? 'Symptom Insights' :
                     type === 'questions' ? 'Suggested Questions' :
                     type === 'terminology' ? 'Medical Terms Explained' :
                     type === 'trends' ? 'Health Trends' : 'Analysis'}
                  </h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{result}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}