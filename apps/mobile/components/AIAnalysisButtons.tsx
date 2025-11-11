import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { IconSymbol } from './ui/IconSymbol';
import { getSupabaseClient } from '../src/lib/supabaseClient';
import { queryGemini } from '../src/lib/gemini';
import { getCurrentRegion } from '../src/lib/regionDetection';

interface DiaryEntry {
  id: string;
  entry_type?: string;
  title?: string;
  date: string;
  notes?: string;
  severity?: string;
}

interface Symptom {
  id: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  severity?: string;
  notes?: string;
}

interface Patient {
  full_name: string;
  notes?: string | null;
  date_of_birth?: string;
  gender?: string;
  relationship?: string;
}

interface AIAnalysisButtonsProps {
  patientId: string;
  diaryEntries: DiaryEntry[];
  symptoms: Symptom[];
  patient?: Patient | null;
  onSuccess?: () => void;
}

const AI_ANALYSIS_TYPES = [
  {
    type: 'symptom-analysis',
    title: 'Symptom Insights',
    description: 'Analyze patterns and correlations',
    icon: 'chart.bar.fill',
    color: '#8B5CF6',
  },
  {
    type: 'questions',
    title: 'Questions for Doctor',
    description: 'Prepare for next visit',
    icon: 'questionmark.circle.fill',
    color: '#3B82F6',
  },
  {
    type: 'terminology',
    title: 'Explain Terms',
    description: 'Understand medical terminology',
    icon: 'book.fill',
    color: '#10B981',
  },
  {
    type: 'trends',
    title: 'Health Trends',
    description: 'Track overall health patterns',
    icon: 'chart.line.uptrend.xyaxis',
    color: '#F59E0B',
  },
];

export default function AIAnalysisButtons({
  patientId,
  diaryEntries,
  symptoms,
  patient,
  onSuccess,
}: AIAnalysisButtonsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [analysisTitle, setAnalysisTitle] = useState<string>('');

  const getPromptForType = (type: string): { title: string; prompt: string } => {
    switch (type) {
      case 'symptom-analysis':
        return {
          title: 'Symptom Insights',
          prompt:
            "Analyze the symptoms and diary entries. Consider the patient's background information, family history, allergies, and other relevant details when available. Look for patterns, correlations between symptoms, and potential triggers. Focus on severity changes and duration patterns.",
        };
      case 'questions':
        return {
          title: 'Suggested Questions for Next Visit',
          prompt:
            'Based on the symptoms, diary entries, and patient information, generate questions that the PATIENT should ask their doctor during the next medical visit. Write the questions in FIRST PERSON from the patient\'s perspective (using "I", "my", "me"). For example: "Given my recent symptoms of X, what tests should I consider?" or "What could be causing my episodes of Y?" DO NOT write questions as if you are the doctor asking the patient. DO NOT use "you/your" to address the patient. The patient will use these questions to advocate for themselves with their healthcare provider. Consider the patient\'s background, family history, allergies, and cultural factors. Prioritize questions based on severity and recency of symptoms.',
        };
      case 'terminology':
        return {
          title: 'Medical Terminology Explanation',
          prompt:
            "Identify and explain any medical terminology found in the diary entries and symptoms. Consider the patient's background and level of health literacy when providing explanations. Provide clear, patient-friendly explanations.",
        };
      case 'trends':
        return {
          title: 'Health Trend Analysis',
          prompt:
            "Analyze the overall health trends based on symptoms, diary entries, and patient information. Consider the patient's background, family history, and other relevant factors when identifying patterns. Identify any improvements or deteriorations, and highlight key patterns in health status.",
        };
      default:
        return { title: 'Analysis', prompt: 'Analyze the provided health data.' };
    }
  };

  const handleAnalysis = async (type: string) => {
    setLoading(type);

    try {
      const supabase = await getSupabaseClient();

      // Prepare context
      const context = JSON.stringify({
        patient: patient
          ? {
              name: patient.full_name,
              dateOfBirth: patient.date_of_birth,
              gender: patient.gender,
              relationship: patient.relationship,
              notes: patient.notes,
            }
          : null,
        diaryEntries: diaryEntries.map((e) => ({
          type: e.entry_type,
          title: e.title,
          date: e.date,
          notes: e.notes,
          severity: e.severity,
        })),
        symptoms: symptoms.map((s) => ({
          description: s.description,
          startDate: s.start_date,
          endDate: s.end_date,
          severity: s.severity,
          notes: s.notes,
        })),
      });

      const { title, prompt } = getPromptForType(type);

      // Get AI response
      const currentRegion = getCurrentRegion();
      const aiResponse = await queryGemini(prompt, context, currentRegion);

      // Save as diary entry
      const { error: insertError } = await supabase.from('diary_entries').insert([
        {
          profile_id: patientId,
          entry_type: 'AI',
          title: `AI Insights: ${title}`,
          date: new Date().toISOString().split('T')[0],
          notes: aiResponse,
          ai_type: type,
          source_entries: diaryEntries.map((e) => e.id),
        },
      ]);

      if (insertError) throw insertError;

      // Show result
      setAnalysisTitle(title);
      setAnalysisResult(aiResponse);
      setShowResult(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      Alert.alert('Error', (err as Error).message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <IconSymbol name="sparkles" size={24} color="#8B5CF6" />
          <Text style={styles.headerTitle}>AI Health Insights</Text>
        </View>

        <View style={styles.buttonsGrid}>
          {AI_ANALYSIS_TYPES.map((analysis) => (
            <TouchableOpacity
              key={analysis.type}
              style={[styles.analysisButton, { borderLeftColor: analysis.color }]}
              onPress={() => handleAnalysis(analysis.type)}
              disabled={loading !== null}
            >
              <View style={styles.buttonContent}>
                <View style={[styles.iconContainer, { backgroundColor: `${analysis.color}15` }]}>
                  {loading === analysis.type ? (
                    <ActivityIndicator color={analysis.color} />
                  ) : (
                    <IconSymbol name={analysis.icon as any} size={24} color={analysis.color} />
                  )}
                </View>
                <View style={styles.buttonText}>
                  <Text style={styles.buttonTitle}>{analysis.title}</Text>
                  <Text style={styles.buttonDescription}>{analysis.description}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoCard}>
          <IconSymbol name="info.circle" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            AI insights are saved to your diary for future reference
          </Text>
        </View>
      </View>

      {/* Result Modal */}
      <Modal visible={showResult} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{analysisTitle}</Text>
            <TouchableOpacity onPress={() => setShowResult(false)}>
              <IconSymbol name="xmark.circle.fill" size={28} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.resultText}>{analysisResult}</Text>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowResult(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  buttonsGrid: {
    gap: 12,
  },
  analysisButton: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    flex: 1,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  buttonDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  resultText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
