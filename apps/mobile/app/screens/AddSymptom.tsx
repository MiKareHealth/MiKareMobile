import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { getSupabaseClient } from '../../src/lib/supabaseClient';

const SEVERITY_LEVELS = [
  { label: 'Mild', value: 'mild', color: '#10B981' },
  { label: 'Moderate', value: 'moderate', color: '#F59E0B' },
  { label: 'Severe', value: 'severe', color: '#EF4444' },
];

const COMMON_SYMPTOMS = [
  'Headache',
  'Fever',
  'Cough',
  'Fatigue',
  'Nausea',
  'Pain',
  'Dizziness',
  'Shortness of Breath',
];

export default function AddSymptom() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [symptomName, setSymptomName] = useState('');
  const [severity, setSeverity] = useState<string>('moderate');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [duration, setDuration] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickSelect = (symptom: string) => {
    setSymptomName(symptom);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!symptomName.trim()) {
      setError('Symptom name is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Prepare symptom data
      const symptom = {
        user_id: user.id,
        patient_id: patientId,
        name: symptomName.trim(),
        severity,
        description: description.trim() || null,
        location: location.trim() || null,
        duration: duration.trim() || null,
        recorded_at: new Date().toISOString(),
      };

      // Insert symptom
      const { error: insertError } = await supabase
        .from('symptoms')
        .insert([symptom]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Symptom recorded successfully!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      setError((err as Error).message);
      Alert.alert('Error', (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#008080" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Symptom</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <IconSymbol name="exclamationmark.triangle" size={20} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Quick Select Common Symptoms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Symptoms</Text>
            <View style={styles.quickSelectGrid}>
              {COMMON_SYMPTOMS.map((symptom) => (
                <TouchableOpacity
                  key={symptom}
                  style={[
                    styles.quickSelectButton,
                    symptomName === symptom && styles.quickSelectButtonActive,
                  ]}
                  onPress={() => handleQuickSelect(symptom)}
                >
                  <Text
                    style={[
                      styles.quickSelectText,
                      symptomName === symptom && styles.quickSelectTextActive,
                    ]}
                  >
                    {symptom}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Symptom Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Symptom Name *</Text>
            <TextInput
              style={styles.input}
              value={symptomName}
              onChangeText={setSymptomName}
              placeholder="e.g., Headache, Fever, Cough..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Severity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity</Text>
            <View style={styles.severityButtons}>
              {SEVERITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.severityButton,
                    severity === level.value && {
                      backgroundColor: level.color,
                      borderColor: level.color,
                    },
                  ]}
                  onPress={() => setSeverity(level.value)}
                >
                  <Text
                    style={[
                      styles.severityButtonText,
                      severity === level.value && styles.severityButtonTextActive,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Left temple, Upper abdomen..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration (optional)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="e.g., 2 hours, Since yesterday..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Additional Details (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the symptom, any triggers, what makes it better or worse..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Record Symptom</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#008080',
    marginLeft: 4,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#DC2626',
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  quickSelectGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickSelectButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
  },
  quickSelectButtonActive: {
    backgroundColor: '#008080',
    borderColor: '#008080',
  },
  quickSelectText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  quickSelectTextActive: {
    color: '#FFFFFF',
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    alignItems: 'center',
  },
  severityButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  severityButtonTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
