import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { OnboardingProvider } from '@/contexts/onboarding-context';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <OnboardingProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: Colors.white },
        }}
      >
        <Stack.Screen name="username" />
        <Stack.Screen name="age" />
        <Stack.Screen name="lock" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="pronouns" />
        <Stack.Screen name="out-status" />
        <Stack.Screen name="identities" />
        <Stack.Screen name="intro" options={{ animation: 'fade' }} />
      </Stack>
    </OnboardingProvider>
  );
}
