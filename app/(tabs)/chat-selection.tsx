import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupCard } from '@/components/home/group-card';
import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

const havenLogo = require('@/assets/images/haven_logo_black.png');
import { popPendingToast } from '@/lib/pending-toast';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useFocusEffect(
    useCallback(() => {
      const msg = popPendingToast();
      if (msg) {
        setToast(msg);
        toastTimer.current = setTimeout(() => setToast(null), 3000);
      }
      return () => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
      };
    }, []),
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {toast && (
        <Animated.View
          entering={FadeInDown.duration(280).springify().damping(18)}
          exiting={FadeOutUp.duration(220)}
          style={styles.toast}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}
      <View style={styles.topBar}>
        <View style={styles.topBarSpacer} />
        <Image source={havenLogo} style={styles.logo} resizeMode="contain" accessibilityLabel="h@ven" />
        <Pressable
          style={({ pressed }) => [styles.profileButton, pressed && styles.profileButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
        >
          <Ionicons name="person" size={20} color={Colors.white} />
        </Pressable>
      </View>

      <FlatList
        data={MOCK_GROUP_CARDS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  topBarSpacer: {
    width: 48,
  },
  logo: {
    flex: 1,
    height: 28,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileButtonPressed: {
    opacity: 0.75,
  },
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  toast: {
    position: 'absolute',
    top: 90,
    alignSelf: 'center',
    backgroundColor: Colors.gray20,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    zIndex: 100,
  },
  toastText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
});
