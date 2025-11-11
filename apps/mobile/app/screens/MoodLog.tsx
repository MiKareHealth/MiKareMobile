import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MoodModal from '../../components/MoodModal';
import { getSupabaseClient } from '../../src/lib/supabaseClient';

export default function MoodLog() {
  const router = useRouter();
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const [patient] = useState({ id: patientId, full_name: 'Patient' } as any);

  const handleMoodSubmit = async (patientId: string, mood: string, notes: string) => {
    const supabase = await getSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error('Not authenticated');

    // Combine mood and notes
    const moodNotes = notes ? `Mood: ${mood}\n\n${notes}` : `Mood: ${mood}`;

    // Save mood as a diary entry
    await supabase.from('diary_entries').insert([{
      profile_id: patientId,
      entry_type: 'mood',
      title: `Mood: ${mood}`, // title is NOT NULL in schema
      notes: moodNotes,
      date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MoodModal
          visible={true}
          patient={patient}
          onClose={handleClose}
          onSubmit={handleMoodSubmit}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    flex: 1,
  },
});
