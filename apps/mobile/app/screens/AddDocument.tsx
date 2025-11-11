import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { getSupabaseClient } from '../../../src/lib/supabaseClient';

const DOCUMENT_TYPES = [
  { label: 'Lab Report', value: 'lab_report', icon: 'doc.text.fill' },
  { label: 'Prescription', value: 'prescription', icon: 'pills.fill' },
  { label: 'Scan/X-Ray', value: 'scan', icon: 'camera.metering.matrix' },
  { label: 'Insurance', value: 'insurance', icon: 'doc.plaintext' },
  { label: 'Other', value: 'other', icon: 'folder.fill' },
];

export default function AddDocument() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();

  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<string>('other');
  const [description, setDescription] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.9,
    });

    if (!result.canceled && result.assets) {
      const newFiles = result.assets.map((asset) => ({
        uri: asset.uri,
        type: 'image',
        name: `image_${Date.now()}.jpg`,
      }));
      setSelectedFiles([...selectedFiles, ...newFiles]);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera is required!');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      const newFile = {
        uri: result.assets[0].uri,
        type: 'image',
        name: `photo_${Date.now()}.jpg`,
      };
      setSelectedFiles([...selectedFiles, newFile]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        multiple: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles = result.assets.map((asset) => ({
          uri: asset.uri,
          type: asset.mimeType?.includes('pdf') ? 'pdf' : 'document',
          name: asset.name || `document_${Date.now()}`,
        }));
        setSelectedFiles([...selectedFiles, ...newFiles]);
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!title.trim()) {
      setError('Document title is required');
      return;
    }

    if (selectedFiles.length === 0) {
      setError('Please add at least one file');
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = await getSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Not authenticated');
      }

      // TODO: Upload files to Supabase storage
      // This is a placeholder - actual implementation would upload each file
      // and get back URLs to store in the database

      // Prepare document data
      const document = {
        user_id: user.id,
        patient_id: patientId,
        title: title.trim(),
        document_type: documentType,
        description: description.trim() || null,
        document_date: documentDate || new Date().toISOString().split('T')[0],
        file_urls: selectedFiles.map((f) => f.uri), // This would be replaced with actual storage URLs
        created_at: new Date().toISOString(),
      };

      // Insert document record
      const { error: insertError } = await supabase
        .from('documents')
        .insert([document]);

      if (insertError) throw insertError;

      Alert.alert('Success', 'Document added successfully!', [
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

  const showAddOptions = () => {
    Alert.alert(
      'Add Document',
      'Choose how to add a document',
      [
        {
          text: 'Take Photo',
          onPress: takePhoto,
        },
        {
          text: 'Choose Photo',
          onPress: pickImage,
        },
        {
          text: 'Choose File (PDF)',
          onPress: pickDocument,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="chevron.left" size={24} color="#008080" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Document</Text>
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

          {/* Document Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.typeRow}>
                {DOCUMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeButton,
                      documentType === type.value && styles.typeButtonActive,
                    ]}
                    onPress={() => setDocumentType(type.value)}
                  >
                    <IconSymbol
                      name={type.icon as any}
                      size={20}
                      color={documentType === type.value ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.typeButtonText,
                        documentType === type.value && styles.typeButtonTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Document Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Blood Test Results, X-Ray Report..."
              placeholderTextColor="#9CA3AF"
            />
          </View>

          {/* Document Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Document Date (optional)</Text>
            <TextInput
              style={styles.input}
              value={documentDate}
              onChangeText={setDocumentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.inputHint}>When was this document created/issued?</Text>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Additional notes about this document..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Files Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Files *</Text>
            <TouchableOpacity style={styles.addFileButton} onPress={showAddOptions}>
              <IconSymbol name="plus.circle.fill" size={28} color="#008080" />
              <Text style={styles.addFileText}>Add Files</Text>
              <Text style={styles.addFileSubtext}>Photos, scans, or PDF documents</Text>
            </TouchableOpacity>

            {selectedFiles.length > 0 && (
              <View style={styles.filesGrid}>
                {selectedFiles.map((file, index) => (
                  <View key={index} style={styles.fileContainer}>
                    {file.type === 'image' ? (
                      <Image source={{ uri: file.uri }} style={styles.filePreview} />
                    ) : (
                      <View style={styles.filePlaceholder}>
                        <IconSymbol name="doc.fill" size={32} color="#6B7280" />
                        <Text style={styles.fileName} numberOfLines={2}>
                          {file.name}
                        </Text>
                      </View>
                    )}
                    <TouchableOpacity
                      style={styles.removeFileButton}
                      onPress={() => removeFile(index)}
                    >
                      <IconSymbol name="xmark.circle.fill" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <IconSymbol name="info.circle" size={20} color="#3B82F6" />
            <Text style={styles.infoText}>
              Store important medical documents like lab results, prescriptions, and imaging reports securely.
            </Text>
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
              <Text style={styles.submitButtonText}>Save Document</Text>
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
  typeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 20,
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#008080',
    borderColor: '#008080',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  typeButtonTextActive: {
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
  addFileButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#008080',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  addFileText: {
    fontSize: 16,
    color: '#008080',
    fontWeight: '600',
    marginTop: 8,
  },
  addFileSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  filesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  fileContainer: {
    width: 100,
    height: 100,
    position: 'relative',
  },
  filePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  filePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  fileName: {
    marginTop: 4,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  removeFileButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  submitButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
