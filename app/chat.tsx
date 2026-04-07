import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

const AVATAR_SIZE = 32;
const AVATAR_OVERLAP = 12;

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
          {MOCK_CHAT_MEMBERS.slice(0, 3).map((m, i) => (
            <View
              key={m.id}
              style={[
                hStyles.stackAvatar,
                {
                  backgroundColor: m.avatarColor,
                  marginLeft: i === 0 ? 0 : -AVATAR_OVERLAP,
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
    fontSize: 11,
    color: Colors.white,
  },
  memberPill: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.gray80,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  memberPillText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.black,
  },
});

// ─── Group sheet ──────────────────────────────────────────────────────────────

const SHEET_OPEN  = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const SHEET_CLOSE = { duration: 260, easing: Easing.in(Easing.cubic)  } as const;
const SHEET_SNAP  = { duration: 200, easing: Easing.out(Easing.quad)  } as const;

function GroupSheet({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const translateY = useSharedValue(600);
  const overlayOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  useEffect(() => { onCloseRef.current = onClose; });

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

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.value = g.dy; },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) handleClose();
        else translateY.value = withTiming(0, SHEET_SNAP);
      },
    }),
  ).current;

  const overlayAnimStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetAnimStyle  = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  return (
    <Modal transparent visible onRequestClose={handleClose}>
      <Animated.View style={[StyleSheet.absoluteFill, sStyles.dim, overlayAnimStyle]} pointerEvents="none" />
      <View style={sStyles.modalRoot}>
        <Pressable style={sStyles.dismissArea} onPress={handleClose} />
        <Animated.View style={[sStyles.sheet, sheetAnimStyle, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
          <View style={sStyles.handleRow} {...panResponder.panHandlers}>
            <View style={sStyles.handle} />
          </View>

          {showLeaveConfirm ? (
            <View style={sStyles.confirmView}>
              <Text style={sStyles.confirmTitle}>Leave this chat?</Text>
              <Text style={sStyles.confirmMessage}>
                You won't be able to rejoin. You can only leave 1 chat per day.
              </Text>
              <View style={sStyles.confirmButtons}>
                <TouchableOpacity style={sStyles.cancelBtn} onPress={() => setShowLeaveConfirm(false)}>
                  <Text style={sStyles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={sStyles.leaveConfirmBtn}
                  onPress={() => {
                    onCloseRef.current();
                    setTimeout(() => router.replace('/(tabs)/chat-selection'), 300);
                  }}
                >
                  <Text style={sStyles.leaveConfirmBtnText}>Leave</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              <Text style={sStyles.title}>Your group</Text>
              <Text style={sStyles.subtitle}>4 people · Day 1 of 7</Text>
              <View style={sStyles.memberList}>
                {MOCK_CHAT_MEMBERS.map((m) => (
                  <View key={m.id} style={sStyles.memberRow}>
                    <View style={[sStyles.memberAvatar, { backgroundColor: m.avatarColor }]}>
                      <Text style={sStyles.memberInitial}>{m.handle[0].toUpperCase()}</Text>
                    </View>
                    <Text style={sStyles.memberHandle}>@{m.handle}</Text>
                    {m.pronouns ? <Text style={sStyles.memberPronouns}>({m.pronouns})</Text> : null}
                  </View>
                ))}
              </View>
              <View style={sStyles.leaveSection}>
                <TouchableOpacity style={sStyles.leaveBtn} onPress={() => setShowLeaveConfirm(true)}>
                  <Text style={sStyles.leaveBtnText}>Leave chat</Text>
                </TouchableOpacity>
                <Text style={sStyles.leaveHelper}>You can only leave 1 chat per day</Text>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const sStyles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.45)' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 16,
  },
  handleRow: { alignItems: 'center', paddingVertical: Spacing.sm },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.gray80 },
  title: { fontFamily: FontFamily.extraBold, fontSize: FontSize.xl, color: Colors.black, marginTop: Spacing.sm, marginBottom: 4 },
  subtitle: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.gray40, marginBottom: Spacing.lg },
  memberList: { gap: Spacing.md, marginBottom: Spacing.xl },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  memberAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.white },
  memberHandle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, color: Colors.black },
  memberPronouns: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.gray40 },
  leaveSection: { gap: Spacing.sm, alignItems: 'center' },
  leaveBtn: { width: '100%', height: 52, borderRadius: Radius.full, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  leaveBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: '#DC2626' },
  leaveHelper: { fontFamily: FontFamily.medium, fontSize: FontSize.xs, color: Colors.gray60 },
  confirmView: { paddingVertical: Spacing.lg, gap: Spacing.md },
  confirmTitle: { fontFamily: FontFamily.extraBold, fontSize: FontSize.xl, color: Colors.black },
  confirmMessage: { fontFamily: FontFamily.medium, fontSize: FontSize.md, color: Colors.gray40, lineHeight: 22 },
  confirmButtons: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  cancelBtn: { flex: 1, height: 52, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.gray80, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.black },
  leaveConfirmBtn: { flex: 1, height: 52, borderRadius: Radius.full, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  leaveConfirmBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, color: Colors.white },
});

// ─── Chat screen ──────────────────────────────────────────────────────────────

function buildInitialRows(sharedBody: string | null): MockChatMessage[] {
  const intro = MOCK_CHAT_THREAD.slice(0, 2);
  const rest  = MOCK_CHAT_THREAD.slice(2);
  const meBody =
    sharedBody?.trim() ||
    "Still sitting with the prompt — grateful to be here with y'all while I figure out the words.";
  const meRow: MockChatMessage = { id: 'me-prompt-answer', authorId: 'me', body: meBody };

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
  const router = useRouter();
  const listRef = useRef<FlatList<MockChatMessage>>(null);

  const [draft, setDraft] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [rows, setRows] = useState<MockChatMessage[]>(() =>
    buildInitialRows(peekPendingPromptShare()?.answer ?? null),
  );

  useEffect(() => { clearPendingPromptShare(); }, []);

  const onSend = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setRows((prev) => [...prev, { id: `local-${Date.now()}`, authorId: 'me', body: text }]);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, [draft]);

  const renderItem: ListRenderItem<MockChatMessage> = useCallback(({ item, index }) => {
    // ── System connection card ──
    if (item.type === 'system-connection' && item.connection) {
      const c = item.connection;
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.body}</Text>
          <View style={styles.connectionCard}>
            <View style={styles.connectionCardHeader}>
              <View style={[styles.connectionAvatar, { backgroundColor: c.avatarColor }]}>
                <Text style={styles.connectionAvatarInitial}>{c.handle[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.connectionHandle}>@{c.handle}</Text>
            </View>
            <Text style={styles.connectionAnswer}>{c.answer}</Text>
          </View>
        </View>
      );
    }

    // ── My messages (outgoing) ──
    if (item.authorId === 'me') {
      return (
        <View style={styles.rowMe}>
          <View style={styles.bubbleMe}>
            <Text style={styles.bubbleMeText}>{item.body}</Text>
          </View>
        </View>
      );
    }

    // ── Others' messages (incoming) ──
    const member = memberById(item.authorId);
    const handle = member?.handle ?? item.authorId;
    const prev = rows[index - 1];
    const next = rows[index + 1];
    const isFirstInGroup = prev?.authorId !== item.authorId;
    const isLastInGroup  = next?.authorId !== item.authorId;

    // Corner radii: first bubble in group has tl:16, continuations have tl:2
    const bubbleStyle = isFirstInGroup
      ? styles.bubbleThemFirst
      : styles.bubbleThemContinuation;

    return (
      <View style={[styles.rowThem, !isLastInGroup && styles.rowThemTight]}>
        {/* Avatar — only on last bubble in group */}
        <View style={styles.avatarSlot}>
          {isLastInGroup && (
            <View style={[styles.avatar, { backgroundColor: member?.avatarColor ?? Colors.gray60 }]}>
              <Text style={styles.avatarInitial}>{handle[0].toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={styles.themContent}>
          {/* Name chip — only on first bubble in group */}
          {isFirstInGroup && (
            <View style={styles.nameChip}>
              <Text style={styles.nameChipHandle}>@{handle}</Text>
              {member?.pronouns ? (
                <Text style={styles.nameChipPronouns}> ({member.pronouns})</Text>
              ) : null}
            </View>
          )}
          <View style={[styles.bubbleThem, bubbleStyle]}>
            <Text style={styles.bubbleThemText}>{item.body}</Text>
          </View>
        </View>
      </View>
    );
  }, [rows]);

  const ListHeader = useCallback(
    () => (
      <View style={styles.welcomeBlock}>
        <Text style={styles.welcomeDate}>April 1, 2026</Text>
        <Text style={styles.welcomeTitle}>Welcome to the chat!</Text>
        <View style={styles.welcomeMeta}>
          <Text style={styles.welcomeMetaText}>With @grover, @staceygirl, @xXrkXx</Text>
          <Text style={styles.welcomeMetaText}>last message sent 2hr ago</Text>
        </View>
      </View>
    ),
    [],
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {sheetVisible && <GroupSheet onClose={() => setSheetVisible(false)} />}

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            onPress={() => router.push('/answers')}
            accessibilityRole="button"
            accessibilityLabel="View answers"
          >
            <Ionicons name="document-text-outline" size={20} color={Colors.white} />
          </Pressable>

          <GroupHeaderCenter onPress={() => setSheetVisible(true)} />

          <Pressable
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Ionicons name="person" size={20} color={Colors.white} />
          </Pressable>
        </View>
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

          {/* Input bar */}
          <View
            style={[
              styles.composerWrap,
              { paddingBottom: Math.max(insets.bottom, Spacing.sm) },
            ]}
          >
            {/* GIF / sticker button */}
            <Pressable
              style={({ pressed }) => [styles.gifBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Send GIF"
            >
              <Text style={styles.gifBtnText}>GIF</Text>
            </Pressable>

            {/* Input field with send arrow inside */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.composer}
                value={draft}
                onChangeText={setDraft}
                placeholder="Say something..."
                placeholderTextColor={Colors.gray80}
                multiline
                scrollEnabled={false}
                maxLength={2000}
                accessibilityLabel="Message input"
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  !draft.trim() && styles.sendBtnQuiet,
                  pressed && draft.trim() ? styles.sendBtnPressed : null,
                ]}
                onPress={onSend}
                disabled={!draft.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send message"
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={draft.trim() ? Colors.white : Colors.gray60}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex:  { flex: 1, backgroundColor: Colors.white },
  inner: { flex: 1, backgroundColor: Colors.white },

  // ── Header ────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.white,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: { opacity: 0.75 },

  // ── Welcome block ─────────────────────────────────────────────────────────
  welcomeBlock: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.xs,
  },
  welcomeDate: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.gray40,
  },
  welcomeTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.8,
    color: Colors.black,
  },
  welcomeMeta: { gap: 2, alignItems: 'center' },
  welcomeMetaText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.gray20,
  },

  // ── List ──────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    flexGrow: 1,
  },

  // ── System connection card ────────────────────────────────────────────────
  systemRow: { alignItems: 'center', marginBottom: Spacing.lg, gap: Spacing.sm },
  systemText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: Colors.purple, textAlign: 'center' },
  connectionCard: { width: '100%', backgroundColor: Colors.purple, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.sm },
  connectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  connectionAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  connectionAvatarInitial: { fontFamily: FontFamily.bold, fontSize: FontSize.sm, color: Colors.white },
  connectionHandle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)' },
  connectionAnswer: { fontFamily: FontFamily.bold, fontSize: FontSize.md, lineHeight: 24, color: Colors.white },

  // ── Outgoing (me) ─────────────────────────────────────────────────────────
  rowMe: { alignItems: 'flex-end', marginBottom: Spacing.sm },
  bubbleMe: {
    maxWidth: '80%',
    backgroundColor: Colors.blue,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 2,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bubbleMeText: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.white },

  // ── Incoming (others) ─────────────────────────────────────────────────────
  rowThem: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm, marginBottom: Spacing.sm },
  rowThemTight: { marginBottom: 3 },
  avatarSlot: { width: 32, height: 32 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: FontFamily.bold, fontSize: 12, color: Colors.white },
  themContent: { flex: 1, maxWidth: '82%', gap: 3 },

  // Name chip above first bubble
  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 24,
    marginBottom: 2,
  },
  nameChipHandle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
    letterSpacing: -0.24,
  },
  nameChipPronouns: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
  },

  // Bubble base
  bubbleThem: {
    backgroundColor: Colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  // First bubble in a group: tl=16
  bubbleThemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
  },
  // Continuation bubble: tl=2
  bubbleThemContinuation: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
  },
  bubbleThemText: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.black },

  // ── Composer ──────────────────────────────────────────────────────────────
  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
  },
  gifBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray60,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gifBtnText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 11,
    color: Colors.gray60,
    letterSpacing: 0.5,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.gray80,
    borderRadius: Radius.full,
    paddingLeft: Spacing.md,
    paddingRight: 6,
    paddingVertical: 6,
    backgroundColor: Colors.white,
    maxHeight: 140,
    minHeight: 48,
  },
  composer: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
  },
  sendBtnQuiet: { backgroundColor: 'transparent' },
  sendBtnPressed: { opacity: 0.9 },
});
