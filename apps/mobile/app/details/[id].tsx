import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Animated,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../src/lib/supabaseClient';
import { performAIAnalysis } from '../../src/lib/aiAnalysis';
import { AI_PROMPTS } from '../../src/lib/aiPrompts';
import { Card } from '../../src/components/ui/Card';
import { Patient } from '../../src/hooks/usePatients';
import { IconSymbol } from '../../components/ui/IconSymbol';

// Local interfaces for mobile app
interface DiaryEntry {
  id: string;
  profile_id: string;
  entry_type: string;
  title: string;
  date: string;
  notes?: string;
  severity?: string;
  attendees?: string[];
  file_url?: string;
  ai_type?: string;
  source_entries?: string[];
  created_at: string;
  updated_at: string;
}

interface Symptom {
  id: string;
  profile_id: string;
  description: string;
  start_date: string;
  end_date?: string;
  severity: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Medication {
  id: string;
  profile_id: string;
  medication_name: string;
  start_date: string;
  end_date?: string;
  dosage: string;
  status: string;
  prescribed_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface MoodEntry {
  id: string;
  profile_id: string;
  date: string;
  body: number;
  mind: number;
  sleep: number;
  mood: number;
  notes?: string;
  created_at: string;
}

// Define the 4 specific AI analysis types from web app
const AI_ANALYSIS_TYPES = [
  {
    type: 'symptom-analysis',
    title: 'Symptom Insights',
    icon: 'psychology',
    color: '#4F46E5', // indigo
  },
  {
    type: 'questions',
    title: 'Suggested Questions',
    icon: 'help',
    color: '#2563EB', // blue
  },
  {
    type: 'summary',
    title: 'Health Summary',
    icon: 'description',
    color: '#059669', // green
  },
  {
    type: 'recommendations',
    title: 'Recommendations',
    icon: 'lightbulb',
    color: '#D97706', // orange
  },
];

export default function PatientDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // Removed animation state for simplicity
  const [selectedTab, setSelectedTab] = useState('diary');
  const [displayLimit, setDisplayLimit] = useState(5);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    dob: '',
    gender: '',
    phone: '',
    address: '',
    country: '',
    notes: '',
  });
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [slideAnim] = useState(new Animated.Value(400)); // Start off-screen at bottom

  // Fetch patient data
  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Patient;
    },
  });

  // Fetch diary entries
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['diary-entries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('profile_id', id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as DiaryEntry[];
    },
  });

  // Fetch symptoms
  const { data: symptoms = [] } = useQuery({
    queryKey: ['symptoms', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('symptoms')
        .select('*')
        .eq('profile_id', id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Symptom[];
    },
  });

  // Fetch medications
  const { data: medications = [] } = useQuery({
    queryKey: ['medications', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('profile_id', id)
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      return data as Medication[];
    },
  });

  // Fetch mood entries
  const { data: moodEntries = [] } = useQuery({
    queryKey: ['mood-entries', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('profile_id', id)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data as MoodEntry[];
    },
  });

  // AI Analysis mutation
  const aiAnalysisMutation = useMutation({
    mutationFn: async (params: {
      type: string;
      patientId: string;
      patientContext: any;
      diaryEntries: any[];
      symptoms: any[];
    }) => {
      return performAIAnalysis(
        params.type,
        params.patientId,
        params.patientContext,
        params.diaryEntries,
        params.symptoms
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary-entries', id] });
      Alert.alert('Success', 'AI analysis completed and added to diary');
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to perform AI analysis');
      console.error('AI Analysis error:', error);
    },
  });

  // Update patient mutation
  const updatePatientMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const { data, error } = await supabase
        .from('patients')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', id] });
      setIsEditing(false);
      setIsSaving(false);
    },
    onError: (error) => {
      Alert.alert('Error', 'Failed to update patient information');
      setIsSaving(false);
      console.error('Update patient error:', error);
    },
  });

  // Removed animation for simplicity

  useEffect(() => {
    if (patient) {
      setEditForm({
        full_name: patient.full_name || '',
        dob: patient.dob || '', // Fixed: use 'dob' instead of 'date_of_birth'
        gender: patient.gender || '',
        phone: patient.phone_number || '',
        address: patient.address || '',
        country: patient.country || '',
        notes: patient.notes || '',
      });
    }
  }, [patient]);

  const handleLoadMore = () => {
    setDisplayLimit(prev => prev + 5);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleBack = () => {
    // Direct navigation without animation
    router.push('/(tabs)/profiles');
  };

  const showAddModal = () => {
    setAddModalVisible(true);
    // Slide in from bottom
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideAddModal = () => {
    // Slide out to bottom
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAddModalVisible(false);
    });
  };

  const handleAddDiary = () => {
    hideAddModal();
    Alert.alert('Add Diary', `Add diary entry for ${patient?.full_name}`);
  };

  const handleAddSymptom = () => {
    hideAddModal();
    Alert.alert('Add Symptom', `Add symptom for ${patient?.full_name}`);
  };

  const handleAddMedication = () => {
    hideAddModal();
    Alert.alert('Add Medication', `Add medication for ${patient?.full_name}`);
  };

  const handleAddDocument = () => {
    hideAddModal();
    Alert.alert('Add Document', `Add document for ${patient?.full_name}`);
  };

  const handleAddNote = () => {
    hideAddModal();
    Alert.alert('Add Note', `Add note for ${patient?.full_name}`);
  };

  const handleLogMood = () => {
    hideAddModal();
    Alert.alert('Log Mood', `Log mood for ${patient?.full_name}`);
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    const updatedData = {
      full_name: editForm.full_name,
      dob: editForm.dob, // Fixed: use 'dob' instead of 'date_of_birth'
      gender: editForm.gender,
      phone_number: editForm.phone,
      address: editForm.address,
      country: editForm.country,
      notes: editForm.notes,
    };

    updatePatientMutation.mutate(updatedData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (patient) {
      setEditForm({
        full_name: patient.full_name || '',
        dob: patient.dob || '', // Fixed: use 'dob' instead of 'date_of_birth'
        gender: patient.gender || '',
        phone: patient.phone_number || '',
        address: patient.address || '',
        country: patient.country || '',
        notes: patient.notes || '',
      });
    }
  };

  const handleAIAnalysis = (promptType: string) => {
    if (!patient) return;
    
    // Create patient context
    const patientContext = {
      name: patient.full_name,
      dateOfBirth: patient.dob, // Fixed: use 'dob' instead of 'date_of_birth'
      gender: patient.gender,
      relationship: patient.relationship,
      notes: patient.notes,
    };
    
    // Transform diary entries to match AI analysis expectations
    const transformedDiaryEntries = diaryEntries.map(entry => ({
      id: entry.id,
      entry_type: entry.entry_type,
      title: entry.title,
      date: entry.date,
      notes: entry.notes,
      severity: entry.severity,
    }));
    
    // Transform symptoms to match AI analysis expectations
    const transformedSymptoms = symptoms.map(symptom => ({
      id: symptom.id,
      description: symptom.description,
      start_date: symptom.start_date,
      end_date: symptom.end_date,
      severity: symptom.severity,
      notes: symptom.notes,
    }));
    
    aiAnalysisMutation.mutate({
      type: promptType,
      patientId: patient.id,
      patientContext,
      diaryEntries: transformedDiaryEntries,
      symptoms: transformedSymptoms,
    });
  };

  const getTabData = () => {
    switch (selectedTab) {
      case 'diary':
        return diaryEntries;
      case 'symptoms':
        return symptoms;
      case 'medications':
        return medications;
      case 'mood':
        return moodEntries;
      default:
        return [];
    }
  };

  // Fixed: Calculate count for each individual tab
  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'diary':
        return diaryEntries.length;
      case 'symptoms':
        return symptoms.length;
      case 'medications':
        return medications.length;
      case 'mood':
        return moodEntries.length;
      default:
        return 0;
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="inbox" size={48} color="#9CA3AF" />
      <Text style={styles.emptyStateText}>No {selectedTab} entries yet</Text>
      <Text style={styles.emptyStateSubtext}>
        Start tracking your health journey by adding your first entry
      </Text>
    </View>
  );

  const renderTabContent = () => {
    const data = getTabData();
    const displayedData = data.slice(0, displayLimit);

    if (data.length === 0) {
      return renderEmptyState();
    }

    return (
      <View>
        {displayedData.map((item: any) => (
          <Card key={item.id} style={styles.entryCard}>
            <View style={styles.entryHeader}>
              <Text style={styles.entryDate}>
                {new Date(item.date || item.start_date || item.created_at).toLocaleDateString()}
              </Text>
              <View style={styles.entryIcons}>
                {/* AI Brain Icon for AI-generated entries */}
                {item.ai_type && (
                  <MaterialIcons name="psychology" size={16} color="#8B5CF6" style={styles.entryIcon} />
                )}
                {/* File Icon for entries with documents */}
                {item.file_url && (
                  <MaterialIcons name="attach-file" size={16} color="#EF4444" style={styles.entryIcon} />
                )}
              </View>
            </View>
            <Text style={styles.entryContent} numberOfLines={3}>
              {item.title || item.description || item.medication_name || `Mood Score: ${item.mood}`}
            </Text>
            {item.notes && (
              <Text style={styles.entryNotes} numberOfLines={2}>
                {item.notes}
              </Text>
            )}
          </Card>
        ))}
        
        {data.length > displayLimit && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={handleLoadMore}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (patientLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#008080" />
        <Text style={styles.loadingText}>Loading patient details...</Text>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Patient not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Floating Back Button */}
      <TouchableOpacity
        style={styles.floatingBackButton}
        onPress={handleBack}
      >
        <MaterialIcons name="arrow-back" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.content}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            {/* Removed header text as requested */}
          </View>

          {/* Patient Profile Card */}
          <Card style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                {patient.photo_url ? (
                  <Image source={{ uri: patient.photo_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>
                      {patient.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
                             <View style={styles.profileInfo}>
                 <Text style={styles.patientName}>{patient.full_name}</Text>
                 <Text style={styles.patientDetails}>
                   {patient.dob ? `DOB: ${new Date(patient.dob).toLocaleDateString()}` : 'No DOB set'}
                 </Text>
                 <Text style={styles.patientDetails}>
                   {patient.gender ? `Gender: ${patient.gender}` : 'No gender set'}
                 </Text>
                 <Text style={styles.patientDetails}>
                   {patient.phone_number ? `Phone: ${patient.phone_number}` : 'No phone set'}
                 </Text>
                 <Text style={styles.patientDetails}>
                   {patient.country ? `Country: ${patient.country}` : 'No country set'}
                 </Text>
                 <Text style={styles.patientDetails}>
                   {patient.address ? `Address: ${patient.address}` : 'No address set'}
                 </Text>
                                   {/* Notes only show in edit mode */}
               </View>
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <MaterialIcons name="edit" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {isEditing && (
              <View style={styles.editForm}>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Full Name</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.full_name}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
                    placeholder="Enter full name"
                  />
                </View>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Date of Birth</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.dob}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, dob: text }))}
                    placeholder="YYYY-MM-DD"
                  />
                </View>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Gender</Text>
                  <View style={styles.dropdownContainer}>
                    <TouchableOpacity
                      style={styles.dropdownButton}
                      onPress={() => {
                        // Simple dropdown implementation
                        Alert.alert(
                          'Select Gender',
                          '',
                          [
                            { text: 'Male', onPress: () => setEditForm(prev => ({ ...prev, gender: 'Male' })) },
                            { text: 'Female', onPress: () => setEditForm(prev => ({ ...prev, gender: 'Female' })) },
                            { text: 'Other', onPress: () => setEditForm(prev => ({ ...prev, gender: 'Other' })) },
                            { text: 'Cancel', style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <Text style={styles.dropdownText}>
                        {editForm.gender || 'Select gender'}
                      </Text>
                      <MaterialIcons name="arrow-drop-down" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.phone}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                    placeholder="Enter phone number"
                    keyboardType="phone-pad"
                  />
                </View>
                
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Address</Text>
                  <TextInput
                    style={styles.formInput}
                    value={editForm.address}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                    placeholder="Enter address"
                    multiline
                  />
                </View>
                
                                 <View style={styles.formRow}>
                   <Text style={styles.formLabel}>Country</Text>
                   <TextInput
                     style={styles.formInput}
                     value={editForm.country}
                     onChangeText={(text) => setEditForm(prev => ({ ...prev, country: text }))}
                     placeholder="Enter country"
                   />
                 </View>
                 
                 <View style={styles.formRow}>
                   <View style={styles.notesHeader}>
                     <MaterialIcons name="info" size={16} color="#6B7280" />
                     <Text style={styles.formLabel}>Notes</Text>
                   </View>
                   <Text style={styles.notesPlaceholder}>
                     Consider adding family history, allergies, cultural background, religious preferences, nationality, or other relevant details that healthcare providers should know.
                   </Text>
                   <TextInput
                     style={[styles.formInput, styles.notesInput]}
                     value={editForm.notes}
                     onChangeText={(text) => setEditForm(prev => ({ ...prev, notes: text }))}
                     placeholder="Add family history, allergies, cultural background, etc."
                     multiline
                     numberOfLines={4}
                   />
                 </View>
                
                <View style={styles.formButtons}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]} 
                    onPress={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.saveButtonText}>Save & Close</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>

          {/* Log Today's Mood Button */}
          <TouchableOpacity style={styles.moodButton}>
            <MaterialIcons name="mood" size={24} color="white" />
            <Text style={styles.moodButtonText}>Log Today's Mood</Text>
          </TouchableOpacity>

          {/* AI Health Insights */}
          <Card style={styles.aiCard}>
            <View style={styles.aiHeader}>
              <MaterialIcons name="psychology" size={24} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>AI Health Insights</Text>
            </View>
            <View style={styles.aiButtonsGrid}>
              {AI_ANALYSIS_TYPES.map((aiType) => (
                <TouchableOpacity
                  key={aiType.type}
                  style={styles.aiButton}
                  onPress={() => handleAIAnalysis(aiType.type)}
                  disabled={aiAnalysisMutation.isPending}
                >
                  {aiAnalysisMutation.isPending ? (
                    <ActivityIndicator size="small" color={aiType.color} />
                  ) : (
                    <MaterialIcons name={aiType.icon as any} size={20} color={aiType.color} />
                  )}
                  <Text style={[styles.aiButtonText, { color: aiType.color }]}>{aiType.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {['diary', 'symptoms', 'medications', 'mood'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    selectedTab === tab && styles.tabButtonActive
                  ]}
                  onPress={() => setSelectedTab(tab)}
                >
                  <Text style={[
                    styles.tabButtonText,
                    selectedTab === tab && styles.tabButtonTextActive
                  ]}>
                    {(tab.charAt(0).toUpperCase() + tab.slice(1)) as String}
                  </Text>
                  <View style={styles.tabCount}>
                    <Text style={styles.tabCountText}>{getTabCount(tab)}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            <ScrollView 
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.tabContentScroll}
            >
              {renderTabContent()}
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      {/* Bottom Menu Bar */}
      <View style={styles.bottomMenuBar}>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={showAddModal}
        >
          <IconSymbol name="plus" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Add Entry Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="none"
        onRequestClose={hideAddModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideAddModal}
        >
          <Animated.View 
            style={[
              styles.addModalContent,
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside modal
            >
              <View style={styles.addModalHeader}>
                <Text style={styles.addModalTitle}>Add Entry</Text>
                <TouchableOpacity onPress={hideAddModal}>
                  <IconSymbol name="xmark.circle.fill" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.addModalSubtitle}>
                Choose what to add for {patient?.full_name}
              </Text>
              
              <View style={styles.addModalOptions}>
                <TouchableOpacity 
                  style={styles.addModalOption}
                  onPress={handleAddDiary}
                >
                  <IconSymbol name="note.text" size={24} color="#008080" />
                  <Text style={styles.addModalOptionText}>Add Diary Entry</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addModalOption}
                  onPress={handleAddSymptom}
                >
                  <IconSymbol name="thermometer" size={24} color="#008080" />
                  <Text style={styles.addModalOptionText}>Add Symptom</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addModalOption}
                  onPress={handleAddMedication}
                >
                  <IconSymbol name="pills" size={24} color="#008080" />
                  <Text style={styles.addModalOptionText}>Add Medication</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addModalOption}
                  onPress={handleAddDocument}
                >
                  <IconSymbol name="camera.fill" size={24} color="#008080" />
                  <Text style={styles.addModalOptionText}>Add Document</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addModalOption}
                  onPress={handleAddNote}
                >
                  <IconSymbol name="doc.text" size={24} color="#008080" />
                  <Text style={styles.addModalOptionText}>Add Note</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.addModalOption}
                  onPress={handleLogMood}
                >
                  <IconSymbol name="heart.fill" size={24} color="#008080" />
                  <Text style={styles.addModalOptionText}>Log Daily Mood</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#139FA0',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 120, // Increased to account for floating back button
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  floatingBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    backgroundColor: '#008080',
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  profileCard: {
    marginHorizontal: 20,
    marginTop: 0,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A202C',
    marginBottom: 8,
  },
  patientDetails: {
    fontSize: 14,
    color: '#4A5568',
    marginBottom: 4,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#008080',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editForm: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  formRow: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#374151',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#008080',
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  moodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006666',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  moodButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  aiCard: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A202C',
    marginLeft: 8,
  },
  aiButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  aiButton: {
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
  },
  aiButtonText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  tabContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 10,
  },
  tabButtonActive: {
    backgroundColor: '#008080',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  tabButtonTextActive: {
    color: 'white',
  },
  tabCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  tabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  tabContent: {
    marginHorizontal: 20,
    marginBottom: 20,
    flex: 1,
  },
  tabContentScroll: {
    paddingBottom: 20,
  },
  entryCard: {
    backgroundColor: '#F0FDFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  entryHeader: {
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  entryIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryIcon: {
    marginLeft: 8,
  },
  entryContent: {
    fontSize: 16,
    color: '#1A202C',
    lineHeight: 24,
  },
  entryNotes: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  loadMoreButton: {
    backgroundColor: '#008080',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  loadMoreText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#139FA0',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#139FA0',
  },
  errorText: {
    color: 'white',
    fontSize: 16,
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  notesText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  notesPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  notesInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bottomMenuBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: '#008080',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  addModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  addModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  addModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  addModalOptions: {
    padding: 20,
  },
  addModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  addModalOptionText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 12,
  },
});
