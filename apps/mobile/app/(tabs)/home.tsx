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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { usePatients, type Patient } from '../../src/hooks/usePatients';
import { useMoodTracking } from '../../src/hooks/useMoodTracking';
import { Card } from '../../src/components/ui/Card';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { getTimeAwareGreeting } from '../../src/utils/timeUtils';
import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../src/lib/supabaseClient';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { patients, isLoading, refetch } = usePatients();
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Direct mood tracking query
  const { data: moodData, isLoading: moodLoading, error: moodError } = useQuery({
    queryKey: ['homeMoodTracking', patients.length],
    queryFn: async () => {
      const supabase = await getSupabaseClient();
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      const totalPatients = patients.length;
      
      console.log('Home Screen Debug - Total patients:', totalPatients);
      
      if (totalPatients === 0) {
        return {
          totalPatients: 0,
          patientsWithMoodToday: 0,
        };
      }
      
             // Get patients with mood entries for today (no user_id filter for demo data)
       const { data: moodEntries, error: moodError } = await supabase
         .from('mood_entries')
         .select('profile_id')
         .gte('created_at', `${today}T00:00:00`)
         .lt('created_at', `${today}T23:59:59`);
       
       if (moodError) {
         throw moodError;
       }
       
       // Count unique patients with mood entries today
       const uniquePatientsWithMood = new Set(moodEntries?.map((entry: any) => entry.profile_id)).size;
      
      console.log('Home Screen Debug - Patients with mood today:', uniquePatientsWithMood);
      console.log('Home Screen Debug - Mood entries found:', moodEntries?.length || 0);
      
      return {
        totalPatients,
        patientsWithMoodToday: uniquePatientsWithMood,
      };
    },
    enabled: !isLoading && patients.length > 0, // Only run when patients are loaded
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 2, // Refetch every 2 minutes
  });

  const totalPatients = moodData?.totalPatients || 0;
  const patientsWithMoodToday = moodData?.patientsWithMoodToday || 0;

  // Additional debugging
  console.log('Home Screen Debug - Patients array length:', patients.length);
  console.log('Home Screen Debug - Mood loading:', moodLoading);
  console.log('Home Screen Debug - Mood error:', moodError);
  console.log('Home Screen Debug - Final totalPatients:', totalPatients);
  console.log('Home Screen Debug - Final patientsWithMoodToday:', patientsWithMoodToday);

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

  const isAllMoodsLogged = totalPatients > 0 && patientsWithMoodToday === totalPatients;
  
  // Debug logging
  console.log('Home Screen Debug - Total patients:', totalPatients);
  console.log('Home Screen Debug - Patients with mood today:', patientsWithMoodToday);
  console.log('Home Screen Debug - Is all moods logged:', isAllMoodsLogged);

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
          </View>

          {/* Today's To-Do List */}
          <Card style={styles.todoCard}>
            <Text style={styles.todoTitle}>Today's To-Do</Text>
            <View style={styles.todoItem}>
              <View style={styles.todoItemLeft}>
                <IconSymbol name="heart.fill" size={20} color="#008080" />
                <Text style={styles.todoItemText}>Mood logged for all profiles</Text>
              </View>
              <View style={styles.todoStatus}>
                {moodLoading ? (
                  <ActivityIndicator size="small" color="#008080" />
                ) : (
                  <>
                    <Text style={styles.todoStatusText}>
                      {patientsWithMoodToday}/{totalPatients}
                    </Text>
                    {isAllMoodsLogged ? (
                      <View style={styles.completedStatus}>
                        <IconSymbol name="checkmark.circle.fill" size={20} color="#008080" />
                      </View>
                    ) : (
                      <View style={[
                        styles.todoStatusDot,
                        { backgroundColor: '#F59E0B' }
                      ]} />
                    )}
                  </>
                )}
              </View>
            </View>
          </Card>

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
    marginBottom: 20,
  },
  greetingText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  todoCard: {
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
  todoTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  todoItemText: {
    fontSize: 15,
    color: '#374151',
    marginLeft: 10,
  },
  todoStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todoStatusText: {
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  todoStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  completedStatus: {
    marginLeft: 8,
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
    gap: 10,
    marginBottom: 10,
  },
  gridTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 85,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  tileIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#008080',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tileText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
});
