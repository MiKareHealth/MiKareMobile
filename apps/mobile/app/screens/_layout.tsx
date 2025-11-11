import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="AddProfile" />
      <Stack.Screen name="EditProfile" />
      <Stack.Screen name="AddDiaryEntry" />
      <Stack.Screen name="AddSymptom" />
      <Stack.Screen name="AddMedication" />
      <Stack.Screen name="AddNote" />
      <Stack.Screen name="AddDocument" />
      <Stack.Screen name="MoodLog" />
    </Stack>
  );
}
