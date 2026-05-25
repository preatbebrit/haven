import {
  Manrope_200ExtraLight,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import 'react-native-reanimated';

import { LockOverlay } from '@/components/lock/lock-overlay';
import { SplashContext } from '@/components/splash/splash-context';
import { SplashOverlay } from '@/components/splash/splash-overlay';
import { ActiveChatProvider } from '@/contexts/active-chat-context';
import { AuthProvider } from '@/contexts/auth-context';
import { CurrentUserProvider } from '@/contexts/current-user-context';
import { FriendsProvider } from '@/contexts/friends-context';
import { LockProvider } from '@/contexts/lock-context';
import { NotificationsProvider } from '@/contexts/notifications-context';
import {
  TabsReplaceAnimProvider,
  useTabsReplaceAnim,
} from '@/contexts/tabs-replace-anim-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { useTheme } from '@/hooks/use-theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_200ExtraLight,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  const handleSplashComplete = useCallback(() => setSplashDone(true), []);
  const splashValue = useMemo(() => ({ done: splashDone }), [splashDone]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <SplashContext.Provider value={splashValue}>
    <AuthProvider>
    <CurrentUserProvider>
    <FriendsProvider>
      <NotificationsProvider>
      <ActiveChatProvider>
      <LockProvider>
        <TabsReplaceAnimProvider>
          <RootStack />
          <ThemedStatusBar />
          <LockOverlay />
          {!splashDone ? <SplashOverlay onComplete={handleSplashComplete} /> : null}
        </TabsReplaceAnimProvider>
      </LockProvider>
      </ActiveChatProvider>
      </NotificationsProvider>
    </FriendsProvider>
    </CurrentUserProvider>
    </AuthProvider>
    </SplashContext.Provider>
    </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedStatusBar() {
  const { theme } = useTheme();
  return <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />;
}

// The (tabs) `animationTypeForReplace` is driven by context so chat leave /
// expiry can flip it to 'pop' (slide-from-left) for that single navigation
// while onboarding completion and other replaces keep the default 'push'
// (slide-from-right).
function RootStack() {
  const { anim } = useTabsReplaceAnim();
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: false,
          animationTypeForReplace: anim,
        }}
      />
      <Stack.Screen name="chat" options={{ headerShown: false, animation: 'fade', animationDuration: 120, gestureEnabled: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="auth/email" options={{ headerShown: false }} />
      <Stack.Screen
        name="answers"
        options={{
          headerShown: false,
          // No screen-level fade: when sharing from /prompt (a transparentModal
          // on top of chat-selection), a fade-in would briefly reveal
          // chat-selection underneath. The card-stack intro inside /answers
          // (introScale/introOpacity) covers the soft-entry feel on its own.
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="user/[username]"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen
        name="friends"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="prompt"
        options={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen
        name="house-rules"
        options={{
          headerShown: false,
          animation: 'none',
          gestureEnabled: false,
          presentation: 'transparentModal',
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
      <Stack.Screen name="photos" options={{ headerShown: false, animation: 'fade', animationDuration: 160 }} />
      <Stack.Screen
        name="share-with"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="report"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
        }}
      />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}
