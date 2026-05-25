import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GroupCard } from '@/components/home/group-card';
import { HouseRulesTile } from '@/components/home/house-rules-tile';
import { AppHeader } from '@/components/ui/app-header';
import { HavenLogo } from '@/components/ui/haven-logo';
import { ProfileIcon } from '@/components/ui/icons/profile-icon';
import { Toast } from '@/components/ui/toast';
import { MOCK_GROUP_CARDS } from '@/constants/mock-groups';
import { Colors, Spacing } from '@/constants/theme';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useNotifications } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import {
  getHouseRulesDismissed,
  setHouseRulesDismissed,
} from '@/lib/house-rules-storage';
import { setHouseRulesTransitionSource } from '@/lib/house-rules-transition';
import { popPendingToast } from '@/lib/pending-toast';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Profile badge counts unique senders with unread activity (matches the
  // My Friends badge on /profile). The raw total-notification count
  // double-counts a single friend who shared gallery + prompts + identity.
  const { friendsWithUnreadCount: unreadCount } = useNotifications();
  const { isHydrated, activeChatId } = useActiveChat();
  const { colors } = useTheme();
  const [toast, setToast] = useState<string | null>(null);
  // null = not yet hydrated, false = show tile, true = dismissed (hide tile)
  const [houseRulesDismissed, setHouseRulesDismissedState] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    getHouseRulesDismissed().then((v) => {
      if (alive) setHouseRulesDismissedState(v);
    });
    return () => {
      alive = false;
    };
  }, []);

  // The (tabs) replace animation is owned by chat.tsx: it flips to 'pop' on
  // chat mount and resets to 'push' in chat's cleanup (post-transition).
  // Doing the reset here instead races the leave animation and flips
  // animationTypeForReplace back to 'push' mid-transition.

  // Coming-out cards are always pinned to the top, regardless of source order.
  const sortedCards = useMemo(
    () =>
      [...MOCK_GROUP_CARDS].sort((a, b) => {
        const aPin = a.kind === 'coming-out' ? 0 : 1;
        const bPin = b.kind === 'coming-out' ? 0 : 1;
        return aPin - bPin;
      }),
    [],
  );

  // Defensive: if state and route get out of sync (e.g. user is in a chat but
  // somehow lands here), bounce them back into /chat. The boot router and the
  // join/leave transitions should normally make this unreachable.
  useFocusEffect(
    useCallback(() => {
      if (isHydrated && activeChatId) {
        router.replace('/chat');
      }
    }, [isHydrated, activeChatId, router]),
  );

  useFocusEffect(
    useCallback(() => {
      const msg = popPendingToast();
      if (msg) setToast(msg);
    }, []),
  );

  const handleHouseRulesPress = useCallback(
    (rect: { x: number; y: number; width: number; height: number }) => {
      setHouseRulesTransitionSource({ rect });
      router.push({ pathname: '/house-rules', params: { source: 'home' } });
    },
    [router],
  );

  const handleHouseRulesDismiss = useCallback(() => {
    setHouseRulesDismissedState(true);
    setHouseRulesDismissed(true);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary }]}>
      <Toast message={toast} onDismiss={() => setToast(null)} />
      <FlatList
        data={sortedCards}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GroupCard group={item} />}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListHeaderComponent={
          <View>
            <AppHeader
              left={{ kind: 'spacer' }}
              center={{
                kind: 'node',
                node: <HavenLogo color={colors.textPrimary} />,
              }}
              right={{
                kind: 'icon',
                icon: <ProfileIcon size={24} color={colors.textPrimaryInverted} />,
                onPress: () => router.push('/profile'),
                accessibilityLabel:
                  unreadCount > 0
                    ? `Open profile. ${unreadCount} new notification${unreadCount === 1 ? '' : 's'}`
                    : 'Open profile',
                badge: unreadCount,
              }}
              style={styles.listHeader}
            />
            {houseRulesDismissed === false && (
              <View style={styles.houseRulesWrap}>
                <HouseRulesTile
                  onPress={handleHouseRulesPress}
                  onDismiss={handleHouseRulesDismiss}
                />
              </View>
            )}
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        contentInsetAdjustmentBehavior="never"
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
  listContent: {
    paddingHorizontal: Spacing.md,
  },
  // The list's contentContainerStyle applies horizontal padding so the cards
  // sit inset; the AppHeader carries its own HEADER_HORIZONTAL padding and
  // expects to extend to the screen edges, so cancel the list's inset here.
  listHeader: {
    marginHorizontal: -Spacing.md,
  },
  houseRulesWrap: {
    paddingTop: 4,
    paddingBottom: Spacing.md,
  },
});
