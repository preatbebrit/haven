import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MOCK_CHAT_MEMBERS, type MockChatMessage, MOCK_CHAT_THREAD } from '@/constants/mock-chat';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { popPendingConnections } from '@/lib/pending-connections';
import { clearPendingPromptShare, peekPendingPromptShare } from '@/lib/pending-share';
import { setPendingToast } from '@/lib/pending-toast';

const WARM_BG = '#ffffff';
const INCOMING_BUBBLE = '#ebe6f7';
const OUTGOING_BLUE = '#1e4ed8';
const USERNAME_BLUE = '#2563eb';
const AVATAR_SIZE = 28;
const AVATAR_OVERLAP = 10;
const AVATAR_OFFSETS = [0, -3, 2, -2];

// ─── Group header center ──────────────────────────────────────────────────────

function GroupHeaderCenter({ onPress }: { onPress: () => void }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.95, { damping: 14, stiffness: 400 });
        opacity.value = withTiming(0.72, { duration: 80 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 400 });
        opacity.value = withTiming(1, { duration: 140 });
      }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="View group members"
      style={{ alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View style={[hStyles.centerWrap, animStyle]}>
        <View style={hStyles.avatarStack}>
          {MOCK_CHAT_MEMBERS.slice(0, 4).map((m, i) => (
            <View
              key={m.id}
              style={[
                hStyles.stackAvatar,
                {
                  backgroundColor: m.avatarColor,
                  marginLeft: i === 0 ? 0 : -AVATAR_OVERLAP,
                  marginTop: AVATAR_OFFSETS[i],
                  zIndex: 10 - i,
                },
              ]}
            >
              <Text style={hStyles.stackAvatarText}>
                {m.handle[0].toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <View style={hStyles.memberPill}>
          <Text style={hStyles.memberPillText}>4 members</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const hStyles = StyleSheet.create({
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackAvatarText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: Colors.white,
  },
  memberPill: {
    backgroundColor: Colors.gray100,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  memberPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.gray40,
  },
});

// ─── Group sheet ──────────────────────────────────────────────────────────────

const SHEET_OPEN = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const SHEET_CLOSE = { duration: 260, easing: Easing.in(Easing.cubic) } as const;
const SHEET_SNAP = { duration: 200, easing: Easing.out(Easing.quad) } as const;

function GroupSheet({
  onClose,
  onLeaveConfirmed,
}: {
  onClose: () => void;
  onLeaveConfirmed: () => void;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(600);
  const overlayOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  const onLeaveConfirmedRef = useRef(onLeaveConfirmed);
  useEffect(() => {
    onCloseRef.current = onClose;
    onLeaveConfirmedRef.current = onLeaveConfirmed;
  });

  useEffect(() => {
    translateY.value = withTiming(0, SHEET_OPEN);
    overlayOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const handleClose = useCallback(() => {
    const closeCb = onCloseRef.current;
    translateY.value = withTiming(700, SHEET_CLOSE, (done) => {
      'worklet';
      if (done) runOnJS(closeCb)();
    });
    overlayOpacity.value = withTiming(0, { duration: 220 });
  }, []);

  function handleLeavePress() {
    Alert.alert(
      'Leave this chat?',
      "You won't be able to rejoin and you can only leave 1 chat per day.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => onLeaveConfirmedRef.current(),
        },
      ],
    );
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.value = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) {
          handleClose();
        } else {
          translateY.value = withTiming(0, SHEET_SNAP);
        }
      },
    }),
  ).current;

  const overlayAnimStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const sheetAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal transparent visible onRequestClose={handleClose}>
      <Animated.View
        style={[StyleSheet.absoluteFill, sStyles.overlay, overlayAnimStyle]}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          sStyles.sheet,
          sheetAnimStyle,
          { paddingBottom: Math.max(insets.bottom, Spacing.lg) },
        ]}
      >
        {/* Drag handle — pan gesture lives here only */}
        <View style={sStyles.handleRow} {...panResponder.panHandlers}>
          <View style={sStyles.handle} />
        </View>

        <Text style={sStyles.title}>Your group</Text>
        <Text style={sStyles.subtitle}>4 people · Day 1 of 7</Text>

        <View style={sStyles.memberList}>
          {MOCK_CHAT_MEMBERS.map((m) => (
            <View key={m.id} style={sStyles.memberRow}>
              <View style={[sStyles.memberAvatar, { backgroundColor: m.avatarColor }]}>
                <Text style={sStyles.memberInitial}>
                  {m.handle[0].toUpperCase()}
                </Text>
              </View>
              <Text style={sStyles.memberHandle}>@{m.handle}</Text>
            </View>
          ))}
        </View>

        <View style={sStyles.leaveSection}>
          <Pressable
            style={({ pressed }) => [sStyles.leaveBtn, pressed && { opacity: 0.7 }]}
            onPress={handleLeavePress}
            accessibilityRole="button"
            accessibilityLabel="Leave chat"
          >
            <Text style={sStyles.leaveBtnText}>Leave chat</Text>
          </Pressable>
          <Text style={sStyles.leaveHelper}>You can only leave 1 chat per day</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const sStyles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    boxShadow: '0 -4px 24px rgba(0,0,0,0.10)',
  },
  handleRow: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gray80,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
    color: Colors.black,
    marginTop: Spacing.sm,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.gray40,
    marginBottom: Spacing.lg,
  },
  memberList: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  memberHandle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.black,
  },
  leaveSection: {
    gap: Spacing.sm,
    alignItems: 'center',
  },
  leaveBtn: {
    width: '100%',
    height: 52,
    borderRadius: Radius.full,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: '#DC2626',
  },
  leaveHelper: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.gray60,
  },
});

// ─── Chat screen ──────────────────────────────────────────────────────────────

function buildInitialRows(sharedBody: string | null): MockChatMessage[] {
  const intro = MOCK_CHAT_THREAD.slice(0, 2);
  const rest = MOCK_CHAT_THREAD.slice(2);
  const meBody =
    sharedBody?.trim() ||
    "Still sitting with the prompt — grateful to be here with y'all while I figure out the words.";
  const meRow: MockChatMessage = {
    id: 'me-prompt-answer',
    authorId: 'me',
    body: meBody,
  };

  const connections = popPendingConnections();
  const connectionRows: MockChatMessage[] = connections.map((c) => ({
    id: `connection-${c.handle}`,
    authorId: 'system',
    body: `You connected with @${c.handle} ♥`,
    type: 'system-connection',
    connection: c,
  }));

  return [...connectionRows, ...intro, meRow, ...rest];
}

function memberById(id: string) {
  return MOCK_CHAT_MEMBERS.find((m) => m.id === id);
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const listRef = useRef<FlatList<MockChatMessage>>(null);

  const [draft, setDraft] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [rows, setRows] = useState<MockChatMessage[]>(() =>
    buildInitialRows(peekPendingPromptShare()?.answer ?? null),
  );

  useEffect(() => {
    clearPendingPromptShare();
  }, []);

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setRows((prev) => [
      ...prev,
      { id: `local-${Date.now()}`, authorId: 'me', body: text },
    ]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [draft]);

  const renderItem: ListRenderItem<MockChatMessage> = useCallback(({ item }) => {
    if (item.type === 'system-connection' && item.connection) {
      const c = item.connection;
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.body}</Text>
          <View style={styles.connectionCard}>
            <View style={styles.connectionCardHeader}>
              <View style={[styles.connectionAvatar, { backgroundColor: c.avatarColor }]}>
                <Text style={styles.connectionAvatarInitial}>
                  {c.handle[0].toUpperCase()}
                </Text>
              </View>
              <Text style={styles.connectionHandle}>@{c.handle}</Text>
            </View>
            <Text style={styles.connectionAnswer}>{c.answer}</Text>
          </View>
        </View>
      );
    }

    if (item.authorId === 'me') {
      return (
        <View style={styles.rowMe}>
          <View style={styles.bubbleMe}>
            <Text style={styles.bubbleMeText}>{item.body}</Text>
          </View>
        </View>
      );
    }

    const member = memberById(item.authorId);
    const handle = member?.handle ?? item.authorId;

    return (
      <View style={styles.rowThem}>
        <View style={[styles.avatar, { backgroundColor: member?.avatarColor ?? Colors.gray60 }]}>
          <Ionicons name="person" size={14} color={Colors.white} />
        </View>
        <View style={styles.themContent}>
          <Text style={styles.senderName}>@{handle}</Text>
          <View style={styles.bubbleThem}>
            <Text style={styles.bubbleThemText}>{item.body}</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  const ListHeader = useCallback(
    () => (
      <View style={styles.listHeader}>
        <Text style={styles.warmLine}>Small group · big hearts · be gentle with each other</Text>
      </View>
    ),
    [],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: '',
          headerStyle: { backgroundColor: WARM_BG },
          headerShadowVisible: false,
          headerLeft: () => (
            <Pressable
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              onPress={() => router.push('/answers')}
              accessibilityRole="button"
              accessibilityLabel="View answers"
            >
              <Ionicons name="document-text" size={18} color={Colors.white} />
            </Pressable>
          ),
          headerTitle: () => (
            <GroupHeaderCenter onPress={() => setSheetVisible(true)} />
          ),
          headerRight: () => (
            <Pressable
              style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
              onPress={() => router.push('/profile')}
              accessibilityRole="button"
              accessibilityLabel="View profile"
            >
              <Ionicons name="person" size={18} color={Colors.white} />
            </Pressable>
          ),
        }}
      />

      {sheetVisible && (
        <GroupSheet
          onClose={() => setSheetVisible(false)}
          onLeaveConfirmed={() => {
            setSheetVisible(false);
            setPendingToast('You left your group');
            router.replace('/(tabs)/home');
          }}
        />
      )}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={headerHeight}
      >
        <View style={styles.inner}>
          <StatusBar style="dark" />
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={[styles.listContent, { paddingBottom: Spacing.lg }]}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            showsVerticalScrollIndicator={false}
          />

          <View
            style={[
              styles.composerWrap,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.sm),
                paddingTop: Spacing.sm,
              },
            ]}
          >
            <TextInput
              style={styles.composer}
              value={draft}
              onChangeText={setDraft}
              placeholder="Say something…"
              placeholderTextColor={Colors.gray60}
              multiline
              maxLength={2000}
              accessibilityLabel="Message reply"
            />
            <Pressable
              style={({ pressed }) => [
                styles.sendBtn,
                !draft.trim() ? styles.sendBtnQuiet : null,
                pressed && draft.trim() ? styles.sendBtnPressed : null,
              ]}
              onPress={onSend}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons
                name="arrow-up"
                size={22}
                color={draft.trim() ? Colors.white : Colors.gray60}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: WARM_BG,
  },
  inner: {
    flex: 1,
    backgroundColor: WARM_BG,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: {
    opacity: 0.75,
  },
  listHeader: {
    paddingBottom: Spacing.md,
    paddingTop: Spacing.xs,
  },
  warmLine: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.gray40,
    lineHeight: 18,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    flexGrow: 1,
  },
  systemRow: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  systemText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: '#8B5CF6',
    textAlign: 'center',
  },
  connectionCard: {
    width: '100%',
    backgroundColor: '#6B2FFF',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  connectionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  connectionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionAvatarInitial: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.white,
  },
  connectionHandle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
  },
  connectionAnswer: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 24,
    color: Colors.white,
  },
  rowMe: {
    alignItems: 'flex-end',
    marginBottom: Spacing.lg,
  },
  bubbleMe: {
    maxWidth: '88%',
    backgroundColor: OUTGOING_BLUE,
    borderRadius: 22,
    borderBottomRightRadius: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  bubbleMeText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 24,
    color: Colors.white,
  },
  rowThem: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
    maxWidth: '100%',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  themContent: {
    flex: 1,
    maxWidth: '86%',
  },
  senderName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: USERNAME_BLUE,
    marginBottom: 4,
    marginLeft: 4,
  },
  bubbleThem: {
    backgroundColor: INCOMING_BUBBLE,
    borderRadius: 22,
    borderBottomLeftRadius: 6,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  bubbleThemText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 24,
    color: Colors.black,
  },
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: WARM_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  composer: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.black,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.gray80,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  sendBtnQuiet: {
    backgroundColor: Colors.gray100,
  },
  sendBtnPressed: {
    opacity: 0.9,
  },
});
