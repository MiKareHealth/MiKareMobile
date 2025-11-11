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

const FREQUENCY_OPTIONS = [
  { label: 'Once Daily', value: 'once_daily' },
  { label: 'Twice Daily', value: 'twice_daily' },
  { label: 'Three Times Daily', value: 'three_times_daily' },
  { label: 'As Needed', value: 'as_needed' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Other', value: 'other' },
];

export default function AddMedication() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<string>('once_daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [prescribedBy, setPrescribedBy] = useState('');
  const [purpose, setPurpose] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!medicationName.trim()) {
      setError('Medication name is required');
      return;
    }

    if (!dosage.trim()) {
      setError('Dosage is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // Prepare medication data
      const medication = {
        user_id: user.id,
        patient_id: patientId,
        name: medicationName.trim(),
        dosage: dosage.trim(),
        frequency,
        start_date: startDate || new Date().toISOString().split('T')[0],
        end_date: endDate || null,
        prescribed_by: prescribedBy.trim() || null,
        purpose: purpose.trim() || null,
        notes: notes.trim() || null,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      // Insert medication
      const { error: insertError } = await supabase
        .from('medications')
        .insert([medication]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Medication added successfully!', [
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
        <Text style={styles.headerTitle}>Add Medication</Text>
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

          {/* Medication Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medication Name *</Text>
            <TextInput
              style={styles.input}
              value={medicationName}
              onChangeText={setMedicationName}
              placeholder="e.g., Aspirin, Lisinopril..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Dosage */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dosage *</Text>
            <TextInput
              style={styles.input}
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g., 10mg, 500mg, 1 tablet..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Frequency */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequency</Text>
            <View style={styles.frequencyGrid}>
              {FREQUENCY_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.frequencyButton,
                    frequency === option.value && styles.frequencyButtonActive,
                  ]}
                  onPress={() => setFrequency(option.value)}
                >
                  <Text
                    style={[
                      styles.frequencyButtonText,
                      frequency === option.value && styles.frequencyButtonTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Start Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.inputHint}>Defaults to today if not provided</Text>
          </View>

          {/* End Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>End Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.inputHint}>Leave blank for ongoing medication</Text>
          </View>

          {/* Prescribed By */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prescribed By (optional)</Text>
            <TextInput
              style={styles.input}
              value={prescribedBy}
              onChangeText={setPrescribedBy}
              placeholder="Doctor's name..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Purpose */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Purpose (optional)</Text>
            <TextInput
              style={styles.input}
              value={purpose}
              onChangeText={setPurpose}
              placeholder="What is this medication for?"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Special instructions, side effects, interactions..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
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
              <Text style={styles.submitButtonText}>Add Medication</Text>
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
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  frequencyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
  },
  frequencyButtonActive: {
    backgroundColor: '#008080',
    borderColor: '#008080',
  },
  frequencyButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  frequencyButtonTextActive: {
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
  inputHint: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  textArea: {
    minHeight: 80,
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
