import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { usePatients } from '../../src/hooks/usePatients';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { getTimeAwareGreeting } from '../../src/utils/timeUtils';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { patients, isLoading, refetch } = usePatients();
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const totalPatients = patients.length;

  useEffect(() => {
    // Fade up animation on load
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const showProfilePicker = (actionRoute: string, actionTitle: string) => {
    if (patients.length === 0) {
      Alert.alert('No Profiles', 'Please add a profile first from the Profiles tab.');
      return;
    }

    if (patients.length === 1) {
      // If only one profile, go directly
      router.push(`${actionRoute}?patientId=${patients[0].id}` as any);
      return;
    }

    // Show profile picker for multiple profiles
    Alert.alert(
      actionTitle,
      'Select a profile:',
      [
        ...patients.map((patient) => ({
          text: patient.full_name,
          onPress: () => router.push(`${actionRoute}?patientId=${patient.id}` as any),
        })),
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const getDisplayName = () => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  };

  return (
    <SafeAreaView style={styles.container}>
             <ScrollView
         style={styles.scrollView}
         refreshControl={
           <RefreshControl 
             refreshing={refreshing} 
             onRefresh={onRefresh}
             tintColor="#008080"
             colors={["#008080"]}
             progressBackgroundColor="#FFFFFF"
           />
         }
       >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Time-aware Greeting */}
          <View style={styles.greetingSection}>
            <Text style={styles.greetingText}>
              {getTimeAwareGreeting(getDisplayName())}
            </Text>
            {totalPatients > 0 && (
              <Text style={styles.greetingSubtext}>
                Managing {totalPatients} {totalPatients === 1 ? 'profile' : 'profiles'}
              </Text>
            )}
          </View>

          {/* Quick Access Grid */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.sectionTitle}>Quick Entry</Text>

            {/* Row 1 */}
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={styles.gridTile}
                onPress={() => showProfilePicker('/screens/AddSymptom', 'Add Symptom')}
              >
                <View style={styles.tileIcon}>
                  <IconSymbol name="thermometer" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.tileText}>Add Symptom</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridTile}
                onPress={() => showProfilePicker('/screens/AddMedication', 'Add Medication')}
              >
                <View style={styles.tileIcon}>
                  <IconSymbol name="pills" size={26} color="#FFFFFF" />
                </View>
                <Text style={styles.tileText}>Add Medication</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2 */}
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={styles.gridTile}
                onPress={() => showProfilePicker('/screens/AddDocument', 'Scan Document')}
              >
                <View style={styles.tileIcon}>
                  <IconSymbol name="camera.fill" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.tileText}>Scan Document</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridTile}
                onPress={() => showProfilePicker('/screens/AddNote', 'Add Note')}
              >
                <View style={styles.tileIcon}>
                  <IconSymbol name="note.text" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.tileText}>Add Note</Text>
              </TouchableOpacity>
            </View>

            {/* Row 3 */}
            <View style={styles.gridRow}>
              <TouchableOpacity
                style={styles.gridTile}
                onPress={() => showProfilePicker('/screens/AddDiaryEntry', 'Add Diary Entry')}
              >
                <View style={styles.tileIcon}>
                  <IconSymbol name="book.fill" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.tileText}>Add Diary Entry</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.gridTile}
                onPress={() => showProfilePicker('/screens/MoodLog', 'Log Mood')}
              >
                <View style={styles.tileIcon}>
                  <IconSymbol name="heart.fill" size={22} color="#FFFFFF" />
                </View>
                <Text style={styles.tileText}>Log Mood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
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
  greetingSection: {
    marginBottom: 24,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  greetingSubtext: {
    fontSize: 15,
    color: '#E0F2F1',
    textAlign: 'center',
    fontWeight: '500',
  },
  quickAccessSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 10,
    marginTop: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  gridTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    shadowColor: '#008080',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  tileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  tileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
});
