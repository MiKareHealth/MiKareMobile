import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { usePatients, type Patient } from '../../src/hooks/usePatients';
import { Card } from '../../src/components/ui/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { useRouter } from 'expo-router';

export default function ProfilesScreen() {
  const { patients, isLoading, deletePatient } = usePatients();
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [slideAnim] = useState(new Animated.Value(300)); // Start off-screen to the right

  useEffect(() => {
    // Fade up animation on load
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const handleAddProfile = () => {
    router.push('/screens/AddProfile');
  };

  const handleEditProfile = (patient: Patient) => {
    router.push(`/screens/EditProfile?patientId=${patient.id}`);
  };

  const handleDeleteProfile = (patient: Patient) => {
    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete ${patient.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePatient(patient.id),
        },
      ]
    );
  };

  const handleLogMood = (patient: Patient) => {
    router.push(`/screens/MoodLog?patientId=${patient.id}`);
  };

  const handleAddDiary = (patient: Patient) => {
    router.push(`/screens/AddDiaryEntry?patientId=${patient.id}`);
  };

  const handleAddSymptom = (patient: Patient) => {
    router.push(`/screens/AddSymptom?patientId=${patient.id}`);
  };

  const handleViewDetails = (patient: Patient) => {
    router.push(`/details/${patient.id}`);
  };

  const showAddModal = (patient: Patient) => {
    setSelectedPatient(patient);
    setAddModalVisible(true);
    // Slide in from right
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideAddModal = () => {
    // Slide out to right
    Animated.timing(slideAnim, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setAddModalVisible(false);
      setSelectedPatient(null);
    });
  };

  const renderProfileCard = (patient: Patient) => (
    <View key={patient.id} style={styles.profileCard}>
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
          <Text style={styles.profileName}>{patient.full_name}</Text>
          {patient.date_of_birth && (
            <Text style={styles.profileSubtext}>
              DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.profileActions}>
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => handleViewDetails(patient)}
        >
          <Text style={styles.viewDetailsButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => showAddModal(patient)}
        >
          <IconSymbol name="plus" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Health Profiles</Text>
            <Text style={styles.subtitle}>
              Manage your health profiles and family members
            </Text>
          </View>

          {/* Profiles List */}
          <View style={styles.profilesSection}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#008080" />
                <Text style={styles.loadingText}>Loading profiles...</Text>
              </View>
            ) : patients.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No profiles yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first health profile to start tracking your wellness journey.
                </Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={handleAddProfile}
                >
                  <Text style={styles.emptyButtonText}>Create Profile</Text>
                </TouchableOpacity>
              </Card>
                         ) : (
               <View style={styles.profilesList}>
                 {patients
                   .sort((a, b) => a.full_name.localeCompare(b.full_name))
                   .map(renderProfileCard)}
               </View>
             )}
          </View>

          {/* Add Profile Button - Moved to bottom */}
          <TouchableOpacity 
            style={styles.addProfileButton}
            onPress={handleAddProfile}
          >
            <View style={styles.addProfileButtonContent}>
              <IconSymbol name="plus.circle.fill" size={24} color="#FFFFFF" />
              <Text style={styles.addProfileButtonText}>Add New Profile</Text>
            </View>
          </TouchableOpacity>

          {/* Info Section */}
          <Card style={styles.infoCard}>
            <Text style={styles.infoTitle}>About Health Profiles</Text>
            <Text style={styles.infoText}>
              Health profiles allow you to track wellness data for yourself and family members. 
              Each profile can have its own entries, mood tracking, and health records.
            </Text>
          </Card>
        </Animated.View>
      </ScrollView>

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
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside modal
            >
                             <View style={styles.addModalHeader}>
                 <Text style={styles.addModalTitle}>Add Entry</Text>
               </View>
              
                             <Text style={styles.addModalSubtitle}>
                 Choose what to add for {selectedPatient?.full_name}
               </Text>
               
               <View style={styles.addModalOptions}>
                 <TouchableOpacity 
                   style={styles.backButton}
                   onPress={hideAddModal}
                 >
                   <IconSymbol name="chevron.left" size={20} color="#008080" />
                   <Text style={styles.backButtonText}>Back to Profiles</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={styles.addModalOption}
                   onPress={() => {
                     hideAddModal();
                     handleAddDiary(selectedPatient!);
                   }}
                 >
                   <IconSymbol name="note.text" size={24} color="#008080" />
                   <Text style={styles.addModalOptionText}>Add Diary Entry</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={styles.addModalOption}
                   onPress={() => {
                     hideAddModal();
                     handleAddSymptom(selectedPatient!);
                   }}
                 >
                   <IconSymbol name="thermometer" size={24} color="#008080" />
                   <Text style={styles.addModalOptionText}>Add Symptom</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.addModalOption}
                   onPress={() => {
                     hideAddModal();
                     router.push(`/screens/AddMedication?patientId=${selectedPatient?.id}`);
                   }}
                 >
                   <IconSymbol name="pills" size={24} color="#008080" />
                   <Text style={styles.addModalOptionText}>Add Medication</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.addModalOption}
                   onPress={() => {
                     hideAddModal();
                     router.push(`/screens/AddDocument?patientId=${selectedPatient?.id}`);
                   }}
                 >
                   <IconSymbol name="camera.fill" size={24} color="#008080" />
                   <Text style={styles.addModalOptionText}>Add Document</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.addModalOption}
                   onPress={() => {
                     hideAddModal();
                     router.push(`/screens/AddNote?patientId=${selectedPatient?.id}`);
                   }}
                 >
                   <IconSymbol name="doc.text" size={24} color="#008080" />
                   <Text style={styles.addModalOptionText}>Add Note</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                   style={styles.addModalOption}
                   onPress={() => {
                     hideAddModal();
                     handleLogMood(selectedPatient!);
                   }}
                 >
                   <IconSymbol name="heart.fill" size={24} color="#008080" />
                   <Text style={styles.addModalOptionText}>Log Daily Mood</Text>
                 </TouchableOpacity>
               </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#139FA0',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5F2F2',
  },
  profilesSection: {
    marginBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 16,
  },
  emptyCard: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyButton: {
    backgroundColor: '#008080',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profilesList: {
    gap: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
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
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  viewDetailsButton: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsButtonText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#008080',
    borderRadius: 22,
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
  addProfileButton: {
    backgroundColor: '#008080',
    borderRadius: 12,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  addProfileButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addProfileButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  infoCard: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  addModalContent: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
  closeButton: {
    padding: 4,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#008080',
    fontWeight: '600',
    marginLeft: 8,
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
