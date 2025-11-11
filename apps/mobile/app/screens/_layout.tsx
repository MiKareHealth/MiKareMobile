import { Stack } from 'expo-router';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'card',
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="AddProfile"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EditProfile"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddDiaryEntry"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddSymptom"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddMedication"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddNote"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddDocument"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MoodLog"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
