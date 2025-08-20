import React, { useState } from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  PDFDownloadLink,
  Image,
} from '@react-pdf/renderer';
import { Loader } from 'lucide-react';
import type {
  Patient,
  DiaryEntry,
  Symptom,
  Medication,
  MoodEntry,
} from '../types/database';
import { queryGemini } from '../lib/gemini';
import { PDFEXPORT_LOGO } from '../config/branding';

interface PDFExportProps {
  patient: Patient;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  medications: Medication[];
  moodEntries: MoodEntry[];
  type: 'summary' | 'detailed';
}

// Create styles only once to prevent HMR conflicts
let styles: any = null;
if (!styles) {
  styles = StyleSheet.create({
    page: {
      padding: 20,
      fontFamily: 'Helvetica',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    headerImage: {
      width: 60,
      height: 30,
      marginRight: 10,
    },
    headerRight: {
      flex: 1,
      flexDirection: 'column',
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#374151',
    },
    headerSubtitle: {
      fontSize: 10,
      color: '#6B7280',
    },
    section: {
      marginBottom: 12,
    },
    title: {
      fontSize: 14,
      fontWeight: 'bold',
      color: '#374151',
      marginBottom: 4,
      borderBottom: '1 solid #E5E7EB',
      paddingBottom: 2,
    },
    rowContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginBottom: 2,
    },
    col: {
      flexDirection: 'row',
      width: '50%',
      marginBottom: 3,
    },
    colFull: {
      flexDirection: 'row',
      width: '100%',
      marginBottom: 3,
    },
    label: {
      fontSize: 8,
      fontWeight: 'bold',
      width: '30%',
      color: '#4B5563',
    },
    value: {
      fontSize: 8,
      flex: 1,
    },
    entry: {
      padding: 5,
      marginBottom: 4,
      backgroundColor: '#F9FAFB',
      borderRadius: 2,
      borderLeft: '2 solid #9CA3AF',
    },
    activeEntry: {
      borderLeft: '2 solid #10B981',
    },
    entryTitle: {
      fontSize: 9,
      fontWeight: 'bold',
    },
    entryText: {
      fontSize: 8,
      marginBottom: 2,
    },
    entryMeta: {
      fontSize: 7,
      color: '#6B7280',
    },
    questionItem: {
      flexDirection: 'row',
      marginBottom: 3,
      paddingLeft: 2,
    },
    questionNumber: {
      fontSize: 8,
      width: 12,
      fontWeight: 'bold',
    },
    questionText: {
      fontSize: 8,
      flex: 1,
    },
    noData: {
      fontSize: 8,
      fontStyle: 'italic',
      color: '#6B7280',
    }
  });
}

const PatientPDF: React.FC<PDFExportProps & { aiQuestions: {date: string; text: string}[] }> = ({
  patient,
  diaryEntries,
  symptoms,
  medications,
  moodEntries,
  type,
  aiQuestions,
}) => {
  // Filter out AI entries completely for both summary and detailed reports
  const nonAiEntries = diaryEntries.filter(e => e.entry_type !== 'AI');
  const summaryEntries = nonAiEntries.slice(-5);

  return (
    <Document>
      {type === 'summary' ? (
        <Page size="A4" style={styles.page}>
          {/* Header with Logo */}
          <View style={styles.header}>
            <Image
              src={PDFEXPORT_LOGO}
              style={styles.headerImage}
            />
            <View style={styles.headerRight}>
              <Text style={styles.headerTitle}>Patient Health Summary</Text>
              <Text style={styles.headerSubtitle}>Generated on {new Date().toLocaleDateString()}</Text>
            </View>
          </View>
          
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.title}>Patient Information</Text>
            <View style={styles.rowContainer}>
              <View style={styles.col}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{patient.full_name}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Relationship:</Text>
                <Text style={styles.value}>{patient.relationship}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>{new Date(patient.dob).toLocaleDateString()}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Birth sex:</Text>
                <Text style={styles.value}>{patient.gender}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>{patient.phone_number}</Text>
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{patient.address}</Text>
              </View>
            </View>
          </View>

          {/* Diary Summary */}
          <View style={styles.section}>
            <Text style={styles.title}>Diary Summary</Text>
            <Text style={styles.entryText}>
              {nonAiEntries.length > 0 
                ? `Patient has ${nonAiEntries.length} diary entries covering ${nonAiEntries.length > 0 ? new Date(nonAiEntries[0].date).toLocaleDateString() : ''} to ${nonAiEntries.length > 0 ? new Date(nonAiEntries[nonAiEntries.length - 1].date).toLocaleDateString() : ''}. Recent entries include ${summaryEntries.slice(0, 3).map(e => e.entry_type).join(', ')}.`
                : 'No diary entries recorded.'
              }
              {moodEntries.length > 0 && ` Patient has logged ${moodEntries.length} mood entries with an average mood score of ${(moodEntries.reduce((sum, m) => sum + m.mood, 0) / moodEntries.length).toFixed(1)}/10.`}
            </Text>
          </View>

          {/* Symptoms Summary */}
          <View style={styles.section}>
            <Text style={styles.title}>Symptoms Summary</Text>
            <Text style={styles.entryText}>
              {symptoms.length > 0 
                ? `Patient has ${symptoms.length} recorded symptoms. Current active symptoms: ${symptoms.filter(s => !s.end_date).length}. Most recent symptoms include ${symptoms.slice(0, 3).map(s => s.description).join(', ')}.`
                : 'No symptoms recorded.'
              }
            </Text>
          </View>

          {/* Active Medications */}
          <View style={styles.section}>
            <Text style={styles.title}>Current Medications</Text>
            {medications && medications.filter(m => m.status === 'Active').length > 0 ? (
              medications
                .filter(m => m.status === 'Active')
                .map((m, i) => (
                  <View key={`med-active-${i}`} style={{...styles.entry, ...styles.activeEntry}}>
                    <Text style={styles.entryTitle}>{m.medication_name} - {m.dosage}</Text>
                    {m.notes && <Text style={styles.entryText}>{m.notes}</Text>}
                    <Text style={styles.entryMeta}>
                      Started: {new Date(m.start_date).toLocaleDateString()}
                      {m.prescribed_by && ` • Prescribed by: ${m.prescribed_by}`}
                    </Text>
                  </View>
                ))
            ) : (
              <Text style={styles.noData}>No active medications</Text>
            )}
            
            {/* Inactive medications as simple list */}
            {medications && medications.filter(m => m.status === 'Inactive').length > 0 && (
              <>
                <Text style={{...styles.entryTitle, marginTop: 4, fontSize: 8}}>Past Medications:</Text>
                <Text style={styles.entryText}>
                  {medications
                    .filter(m => m.status === 'Inactive')
                    .map(m => m.medication_name)
                    .join(', ')}
                </Text>
              </>
            )}
          </View>

          {/* Questions for Next Visit - Most important section */}
          <View style={styles.section}>
            <Text style={styles.title}>Suggested Questions for Next Visit</Text>
            {aiQuestions && aiQuestions.length > 0 ? (
              aiQuestions.map((q, i) => (
                <View key={i} style={styles.questionItem}>
                  <Text style={styles.questionNumber}>{i+1}.</Text>
                  <Text style={styles.questionText}>{q.text}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No suggested questions available</Text>
            )}
          </View>

          {/* Current Symptoms */}
          <View style={styles.section}>
            <Text style={styles.title}>Current Symptoms</Text>
            {symptoms && symptoms.length > 0 ? (
              symptoms.map((s, i) => (
                <View key={i} style={styles.entry}>
                  <Text style={styles.entryTitle}>{s.description} - {s.severity}</Text>
                  {s.notes && <Text style={styles.entryText}>{s.notes}</Text>}
                  <Text style={styles.entryMeta}>
                    Started: {new Date(s.start_date).toLocaleDateString()}
                    {s.end_date && ` • Ended: ${new Date(s.end_date).toLocaleDateString()}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No symptoms recorded</Text>
            )}
          </View>
          
          {/* Recent Diary Entries */}
          <View style={styles.section}>
            <Text style={styles.title}>Recent Health Events</Text>
            {summaryEntries && summaryEntries.length > 0 ? (
              summaryEntries.map((e, i) => (
                <View key={i} style={styles.entry}>
                  <Text style={styles.entryTitle}>
                    {e.title} ({e.entry_type})
                  </Text>
                  {e.notes && (
                    <Text style={styles.entryText}>
                      {e.notes.length > 100 ? `${e.notes.substring(0, 100)}...` : e.notes}
                    </Text>
                  )}
                  <Text style={styles.entryMeta}>
                    Date: {new Date(e.date).toLocaleDateString()}
                    {e.attendees && e.attendees.length > 0 && 
                      ` • Attendees: ${e.attendees.join(', ')}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No recent health events</Text>
            )}
          </View>
          
          {/* Footer */}
          <View style={{ position: 'absolute', bottom: 20, left: 20, right: 20, fontSize: 8, textAlign: 'center', color: '#9CA3AF' }}>
            <Text>This summary was generated by MiKare - Your personal health companion</Text>
            <Text>For medical advice, please consult with a healthcare professional</Text>
          </View>
        </Page>
      ) : (
        <Page size="A4" style={styles.page}>
          {/* Logo */}
          <View style={styles.header}>
            <Image
              src={PDFEXPORT_LOGO}
              style={styles.headerImage}
            />
            <View style={styles.headerRight}>
              <Text style={styles.headerTitle}>Detailed Patient Report</Text>
              <Text style={styles.headerSubtitle}>Generated on {new Date().toLocaleDateString()}</Text>
            </View>
          </View>
          
          {/* Profile Header */}
          <View style={styles.section}>
            <Text style={styles.title}>Patient Information</Text>
            <View style={styles.rowContainer}>
              <View style={styles.colFull}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{patient.full_name}</Text>
              </View>
              <View style={styles.colFull}>
                <Text style={styles.label}>Relationship:</Text>
                <Text style={styles.value}>{patient.relationship}</Text>
              </View>
              <View style={styles.colFull}>
                <Text style={styles.label}>Date of Birth:</Text>
                <Text style={styles.value}>
                  {new Date(patient.dob).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.colFull}>
                <Text style={styles.label}>Address:</Text>
                <Text style={styles.value}>{patient.address}</Text>
              </View>
              <View style={styles.colFull}>
                <Text style={styles.label}>Contact:</Text>
                <Text style={styles.value}>{patient.phone_number}</Text>
              </View>
            </View>
          </View>

          {/* Detailed Medications */}
          <View style={styles.section}>
            <Text style={styles.title}>Medications</Text>
            <Text style={{fontSize: 9, fontWeight: 'bold', marginBottom: 2}}>Active</Text>
            {medications && medications.filter(m => m.status === 'Active').length > 0 ? (
              medications
                .filter(m => m.status === 'Active')
                .map((m, i) => (
                  <View key={`med-active-${i}`} style={styles.entry}>
                    <Text style={styles.entryTitle}>{m.medication_name}</Text>
                    {m.dosage && <Text style={styles.entryText}>Dosage: {m.dosage}</Text>}
                    <Text style={styles.entryText}>Start date: {new Date(m.start_date).toLocaleDateString()}</Text>
                    {m.notes && <Text style={styles.entryText}>Notes: {m.notes}</Text>}
                  </View>
                ))
            ) : (
              <Text style={styles.noData}>N/A</Text>
            )}
            <Text style={{fontSize: 9, fontWeight: 'bold', marginTop: 6, marginBottom: 2}}>Inactive</Text>
            {medications && medications.filter(m => m.status === 'Inactive').length > 0 ? (
              medications
                .filter(m => m.status === 'Inactive')
                .map((m, i) => (
                  <View key={`med-inactive-${i}`} style={styles.entry}>
                    <Text style={styles.entryTitle}>{m.medication_name}</Text>
                    <Text style={styles.entryText}>Start date: {new Date(m.start_date).toLocaleDateString()}</Text>
                    {m.end_date && <Text style={styles.entryText}>End date: {new Date(m.end_date).toLocaleDateString()}</Text>}
                  </View>
                ))
            ) : (
              <Text style={styles.noData}>N/A</Text>
            )}
          </View>

          {/* Symptoms */}
          <View style={styles.section}>
            <Text style={styles.title}>Symptoms</Text>
            {symptoms.length > 0 ? (
              symptoms.map((s, i) => (
                <View key={i} style={styles.entry}>
                  <Text style={styles.entryTitle}>{s.description}</Text>
                  <Text style={styles.entryText}>Severity: {s.severity}</Text>
                  <Text style={styles.entryMeta}>
                    Start: {new Date(s.start_date).toLocaleDateString()}
                    {s.end_date && ` • End: ${new Date(s.end_date).toLocaleDateString()}`}
                  </Text>
                  {s.notes && <Text style={styles.entryText}>Notes: {s.notes}</Text>}
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No symptoms recorded</Text>
            )}
          </View>

          {/* Diary Timeline */}
          <View style={styles.section}>
            <Text style={styles.title}>Diary Timeline</Text>
            {nonAiEntries.length > 0 ? (
              nonAiEntries.map((e, i) => (
                <View key={i} style={styles.entry}>
                  <Text style={styles.entryTitle}>{e.title}</Text>
                  <Text style={styles.entryText}>Type: {e.entry_type}</Text>
                  {e.severity && (
                    <Text style={styles.entryText}>Severity: {e.severity}</Text>
                  )}
                  {e.notes && <Text style={styles.entryText}>{e.notes}</Text>}
                  <Text style={styles.entryMeta}>
                    Date: {new Date(e.date).toLocaleDateString()}
                    {e.attendees && e.attendees.length > 0 && 
                      ` • Attendees: ${e.attendees.join(', ')}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noData}>No diary entries recorded</Text>
            )}
          </View>
        </Page>
      )}
    </Document>
  );
};

// Export as link items instead of PDFDownloadLink
export default function PDFExport({
  patient,
  diaryEntries,
  symptoms,
  medications,
  moodEntries,
  type,
}: PDFExportProps) {
  return (
    <div 
      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
      onClick={() => {
        // Just display the report type name, generation happens in ReportMenu component
      }}
    >
      {type === 'summary' ? 'Summary Report' : 'Detailed Report'}
    </div>
  );
}

// Separate component to generate and download reports when clicked
export const GenerateReport = ({
  patient,
  diaryEntries,
  symptoms,
  medications,
  moodEntries,
  type,
  onClose,
  isCustomRangeValid = true,
  shouldGenerate = true
}: PDFExportProps & { onClose?: () => void; isCustomRangeValid?: boolean; shouldGenerate?: boolean }) => {
  const [aiQuestions, setAiQuestions] = useState<{date: string; text: string}[]>([]);
  const [diarySummary, setDiarySummary] = useState<string>('');
  const [symptomsSummary, setSymptomsSummary] = useState<string>('');
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(shouldGenerate);
  const [generatingPDF, setGeneratingPDF] = useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(!shouldGenerate);

  // Generate questions when the component mounts
  React.useEffect(() => {
    if (!shouldGenerate) return;
    
    const generateQuestions = async () => {
      setLoadingQuestions(true);
      
      try {
        if (type === 'summary') {
          // Build context for AI
          const context = JSON.stringify({
            symptoms: symptoms.map(s => ({
              description: s.description,
              severity: s.severity,
              startDate: s.start_date,
              endDate: s.end_date,
              notes: s.notes
            })),
            diaryEntries: diaryEntries.filter(e => e.entry_type !== 'AI').map(e => ({
              type: e.entry_type,
              title: e.title,
              date: e.date,
              notes: e.notes
            })),
            moodEntries: moodEntries.map(m => ({
              date: m.date,
              mood: m.mood,
              body: m.body,
              mind: m.mind,
              sleep: m.sleep,
              notes: m.notes
            })),
            medications: medications.map(m => ({
              name: m.medication_name,
              status: m.status,
              dosage: m.dosage,
              startDate: m.start_date,
              endDate: m.end_date
            }))
          });
          
          // Generate diary summary
          const diaryPrompt = "Based on this patient's diary entries and mood tracking data, provide a concise 2-3 sentence summary of their recent health events, medical history, and emotional well-being. Include insights about their mood patterns, sleep quality, and overall health journey. Focus on the most important appointments, diagnoses, treatments, and emotional trends.";
          const diaryResult = await queryGemini(diaryPrompt, context);
          setDiarySummary(diaryResult);
          
          // Generate symptoms summary
          const symptomsPrompt = "Based on this patient's symptoms, provide a concise 2-3 sentence summary of their current health status and ongoing issues. Focus on severity and duration of symptoms.";
          const symptomsResult = await queryGemini(symptomsPrompt, context);
          setSymptomsSummary(symptomsResult);
          
          // Generate questions for next visit
          const questionsPrompt = "Based on this patient's medical history, generate the 5 most important questions to ask during the next medical visit. Format each question on a new line with a number. Prioritize the most critical health concerns. Questions should be clear, specific, and actionable. For example: 1. Have you noticed any changes in symptom X since starting medication Y?";
          const questionsResult = await queryGemini(questionsPrompt, context);
          
          // Parse the returned content (should be a numbered list)
          const questionLines = questionsResult.split('\n').filter(line => 
            line.trim().match(/^\d+\./) // Find lines starting with a number and period
          );
          
          const today = new Date().toISOString().split('T')[0];
          
          // Create question objects
          const parsedQuestions = questionLines.map(line => {
            // Remove the number prefix (e.g., "1. ")
            const questionText = line.replace(/^\d+\.\s*/, '').trim();
            return {
              date: today,
              text: questionText
            };
          });
          
          setAiQuestions(parsedQuestions.slice(0, 5)); // Ensure we only keep top 5
        } else {
          // For detailed reports, we don't need summaries or questions
          setAiQuestions([]);
          setDiarySummary('');
          setSymptomsSummary('');
        }
      } catch (error) {
        console.error('Error generating summaries:', error);
        setAiQuestions([{
          date: new Date().toISOString().split('T')[0],
          text: 'Error generating questions. Please try again later.'
        }]);
        setDiarySummary('Error generating diary summary. Please try again later.');
        setSymptomsSummary('Error generating symptoms summary. Please try again later.');
      } finally {
        setLoadingQuestions(false);
        setReady(true); // Mark as ready to generate PDF
      }
    };

    generateQuestions();
  }, [type, symptoms, diaryEntries, moodEntries, medications]);
  
  const filename = `${patient.full_name
    .toLowerCase()
    .replace(/\s+/g, '-')}-${type}-report.pdf`;

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-500" />
          <p className="text-gray-600">Analyzing data to generate questions...</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-teal-500" />
          <p className="text-gray-600">Preparing report...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white">
      <h3 className="text-lg font-medium text-gray-900 mb-4">
        {type === 'summary' ? 'Summary Report' : 'Detailed Report'} Ready
      </h3>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-4">Your report is ready to download. Click the button below to download the PDF.</p>
        
        {type === 'summary' && (
          <div className="space-y-4">
            {/* Diary Summary */}
            {diarySummary && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Diary Summary:</h4>
                <p className="text-blue-800 text-sm leading-relaxed">{diarySummary}</p>
              </div>
            )}
            
            {/* Symptoms Summary */}
            {symptomsSummary && (
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900 mb-2">Symptoms Summary:</h4>
                <p className="text-orange-800 text-sm leading-relaxed">{symptomsSummary}</p>
              </div>
            )}
            
            {/* Questions for Next Visit */}
            {aiQuestions.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Questions for Next Visit:</h4>
                <div className="max-h-48 overflow-y-auto">
                  <ul className="list-disc pl-5 space-y-1 text-gray-700">
                    {aiQuestions.map((q, i) => (
                      <li key={i} className="text-sm leading-relaxed">{q.text}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        
        {isCustomRangeValid ? (
          <PDFDownloadLink
            document={
              <PatientPDF
                patient={patient}
                diaryEntries={diaryEntries}
                symptoms={symptoms}
                medications={medications}
                moodEntries={moodEntries}
                type={type}
                aiQuestions={aiQuestions}
              />
            }
            fileName={filename}
            className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
          >
            Download PDF
          </PDFDownloadLink>
        ) : (
          <button
            disabled
            className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          >
            Download PDF
          </button>
        )}
      </div>
    </div>
  );
};