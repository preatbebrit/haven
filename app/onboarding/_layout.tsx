import { Stack } from 'expo-router';

import { OnboardingProvider } from '@/contexts/onboarding-context';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingLayout() {
  const { colors } = useTheme();
  return (
    <OnboardingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          contentStyle: { backgroundColor: colors.backgroundPrimary },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="intro" options={{ animation: 'fade' }} />
      </Stack>
    </OnboardingProvider>
  );
}
