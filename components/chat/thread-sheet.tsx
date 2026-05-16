import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GifPickerSheet } from '@/components/chat/gif-picker-sheet';
import { MessageBubbleContent } from '@/components/chat/message-bubble-content';
import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import type { GenderSymbol } from '@/components/ui/gender-avatar';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { GifIcon } from '@/components/ui/icons/gif-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { type MockChatMessage } from '@/constants/mock-chat';
import { getChatUserByHandle } from '@/constants/mock-chat-content';
import type { MockGif } from '@/constants/mock-gifs';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SHEET_OPEN = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const SHEET_CLOSE = { duration: 260, easing: Easing.in(Easing.cubic) } as const;
const SHEET_SNAP = { duration: 200, easing: Easing.out(Easing.quad) } as const;

type Props = {
  parent: MockChatMessage | null;
  replies: MockChatMessage[];
  onClose: () => void;
  onSendReply: (body: string, gif?: { url: string; title: string }) => void;
  onGoToMessage?: (id: string) => void;
};

export function ThreadSheet(props: Props) {
  if (!props.parent) return null;
  return <ThreadSheetBody {...props} parent={props.parent} />;
}

function ThreadSheetBody({
  parent,
  replies,
  onClose,
  onSendReply,
  onGoToMessage,
}: Props & { parent: MockChatMessage }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const sheetHeight = windowHeight * 0.85;

  const translateY = useSharedValue(sheetHeight + 60);
  const overlayOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  const [draft, setDraft] = useState('');
  const [stagedGif, setStagedGif] = useState<MockGif | null>(null);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);

  useEffect(() => {
    translateY.value = withTiming(0, SHEET_OPEN);
    overlayOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const handleClose = useCallback(() => {
    const closeCb = onCloseRef.current;
    translateY.value = withTiming(sheetHeight + 60, SHEET_CLOSE, (done) => {
      'worklet';
      if (done) runOnJS(closeCb)();
    });
    overlayOpacity.value = withTiming(0, { duration: 220 });
  }, [sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.value = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) handleClose();
        else translateY.value = withTiming(0, SHEET_SNAP);
      },
    }),
  ).current;

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const parentAuthor = authorInfo(parent);

  const handleSend = useCallback(() => {
    const text = draft.trim();
    if (!text && !stagedGif) return;
    const gif = stagedGif ? { url: stagedGif.url, title: stagedGif.title } : undefined;
    onSendReply(text, gif);
    setDraft('');
    setStagedGif(null);
  }, [draft, stagedGif, onSendReply]);

  return (
    <Modal transparent visible onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.dim, overlayStyle]}
        pointerEvents="none"
      />
      <View style={styles.modalRoot}>
        <Pressable style={styles.dismissArea} onPress={handleClose} />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { height: sheetHeight, backgroundColor: colors.backgroundPrimary },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
          >
            <View style={styles.grabberArea} {...panResponder.panHandlers}>
              <View style={[styles.grabber, { backgroundColor: colors.gray80 }]} />
            </View>

            <View style={styles.header}>
              <PressableScale
                style={[styles.closeBtn, { backgroundColor: colors.buttonPrimary }]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close thread"
              >
                <CloseIcon size={24} color={colors.textPrimaryInverted} />
              </PressableScale>
              <View style={styles.headerCenter}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Thread</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                </Text>
              </View>
              <View style={styles.closeBtnSpacer} />
            </View>

            <Pressable
              onPress={() => {
                if (!onGoToMessage) return;
                const id = parent.id;
                handleClose();
                setTimeout(() => onGoToMessage(id), 260);
              }}
              style={({ pressed }) => [
                styles.parentWrap,
                pressed && onGoToMessage ? { opacity: 0.8 } : null,
              ]}
              accessibilityRole={onGoToMessage ? 'button' : undefined}
              accessibilityLabel={
                onGoToMessage ? 'Jump to original message' : undefined
              }
              disabled={!onGoToMessage}
            >
              <View style={styles.parentRow}>
                {parentAuthor.kind === 'other' && (
                  <View style={styles.parentAvatar}>
                    <GenderAvatar
                      symbol={parentAuthor.avatarSymbol}
                      size={32}
                      bgColor={parentAuthor.bg}
                      symbolColor={parentAuthor.symbol}
                    />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {parentAuthor.kind === 'other' && (
                    <View style={styles.nameChip}>
                      <Text style={styles.nameChipHandle}>@{parentAuthor.handle}</Text>
                      {parentAuthor.pronouns ? (
                        <Text style={styles.nameChipPronouns}> ({parentAuthor.pronouns})</Text>
                      ) : null}
                    </View>
                  )}
                  <MessageBubbleContent message={parent} />
                </View>
              </View>
              {onGoToMessage && (
                <Text style={styles.jumpHint}>Tap to jump to original</Text>
              )}
            </Pressable>

            <View style={[styles.divider, { backgroundColor: colors.gray100 }]} />

            <FlatList
              data={replies}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ReplyRow message={item} />}
              contentContainerStyle={styles.list}
              ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Be the first to reply</Text>
                </View>
              }
            />

            <View
              style={[
                styles.composerWrap,
                {
                  paddingBottom: Math.max(insets.bottom, Spacing.sm),
                  backgroundColor: colors.backgroundPrimary,
                  borderTopColor: colors.gray100,
                },
              ]}
            >
              <PressableScale
                style={[styles.gifBtn, { borderColor: colors.gray80 }]}
                onPress={() => setGifPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Send GIF"
              >
                <GifIcon size={24} color={colors.textPrimary} />
              </PressableScale>

              <View
                style={[
                  styles.inputRow,
                  { borderColor: colors.gray80, backgroundColor: colors.backgroundPrimary },
                ]}
              >
                {stagedGif && (
                  <View style={styles.stagedGifWrap}>
                    <ExpoImage
                      source={{ uri: stagedGif.url }}
                      style={styles.stagedGifImage}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.stagedGifRemove}
                      onPress={() => setStagedGif(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Remove GIF"
                      hitSlop={6}
                    >
                      <CloseIcon size={14} color={Colors.white} />
                    </Pressable>
                  </View>
                )}
                <TextInput
                  style={[styles.composer, { color: colors.textPrimary }]}
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={`Reply to ${parentAuthor.kind === 'me' ? 'yourself' : `@${parentAuthor.handle}`}...`}
                  placeholderTextColor={colors.gray80}
                  multiline
                  scrollEnabled={false}
                  maxLength={2000}
                />
                <Pressable
                  onPress={handleSend}
                  disabled={!draft.trim() && !stagedGif}
                  style={({ pressed }) => [
                    styles.sendBtn,
                    { backgroundColor: colors.buttonPrimary },
                    !draft.trim() && !stagedGif && styles.sendBtnQuiet,
                    pressed && (draft.trim() || stagedGif) ? { opacity: 0.9 } : null,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Send reply"
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={draft.trim() || stagedGif ? colors.textPrimaryInverted : Colors.gray60}
                  />
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>

      {gifPickerOpen && (
        <GifPickerSheet
          onSelect={(gif) => {
            setStagedGif(gif);
            setGifPickerOpen(false);
          }}
          onClose={() => setGifPickerOpen(false)}
        />
      )}
    </Modal>
  );
}

function ReplyRow({ message }: { message: MockChatMessage }) {
  const author = authorInfo(message);
  if (author.kind === 'me') {
    return (
      <View style={styles.replyRowMe}>
        <MessageBubbleContent message={message} />
      </View>
    );
  }
  return (
    <View style={styles.replyRowThem}>
      <View style={styles.avatarSlot}>
        <GenderAvatar
          symbol={author.avatarSymbol}
          size={28}
          bgColor={author.bg}
          symbolColor={author.symbol}
        />
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.nameChip}>
          <Text style={styles.nameChipHandle}>@{author.handle}</Text>
          {author.pronouns ? (
            <Text style={styles.nameChipPronouns}> ({author.pronouns})</Text>
          ) : null}
        </View>
        <MessageBubbleContent message={message} />
      </View>
    </View>
  );
}

type AuthorInfo =
  | { kind: 'me'; handle?: string; pronouns?: string; avatarSymbol?: GenderSymbol; bg?: string; symbol?: string }
  | {
      kind: 'other';
      handle: string;
      pronouns?: string;
      avatarSymbol: GenderSymbol;
      bg: string;
      symbol: string;
    };

const DEFAULT_AVATAR_SYMBOL: GenderSymbol = 'nonbinary';

function authorInfo(msg: MockChatMessage): AuthorInfo {
  if (msg.authorId === 'me') return { kind: 'me' };
  if (msg.type === 'system-connection' && msg.connection) {
    const { bg, symbol } = getAvatarColors(msg.connection.handle);
    return {
      kind: 'other',
      handle: msg.connection.handle,
      pronouns: msg.connection.pronouns,
      avatarSymbol: msg.connection.avatarSymbol,
      bg,
      symbol,
    };
  }
  const member = getChatUserByHandle(msg.authorId);
  const { bg, symbol } = getAvatarColors(msg.authorId);
  return {
    kind: 'other',
    handle: member?.handle ?? msg.authorId,
    pronouns: member?.pronouns,
    avatarSymbol: member?.avatarSymbol ?? DEFAULT_AVATAR_SYMBOL,
    bg,
    symbol,
  };
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  dim: { backgroundColor: 'rgba(0,0,0,0.70)' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.xs,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 16,
  },
  grabberArea: { alignItems: 'center', paddingVertical: 8 },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.gray80 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerCenter: { alignItems: 'center' },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnSpacer: { width: 40 },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    letterSpacing: -0.32,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.gray40,
    marginTop: 2,
  },

  parentWrap: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  parentRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  parentAvatar: {},
  jumpHint: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.blue,
    marginTop: 6,
    marginLeft: 40,
    textDecorationLine: 'underline',
  },
  nameChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray100,
    alignSelf: 'flex-start',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    height: 24,
    marginBottom: 4,
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

  divider: { height: 1, backgroundColor: Colors.gray100, marginHorizontal: Spacing.md },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.md },
  replyRowMe: { alignItems: 'flex-end' },
  replyRowThem: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.sm },
  avatarSlot: { width: 28, height: 28 },
  empty: { alignItems: 'center', paddingTop: Spacing.xl },
  emptyText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.gray40 },

  composerWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.gray100,
  },
  gifBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gray80,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
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
  stagedGifWrap: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
    marginRight: Spacing.sm,
    alignSelf: 'center',
  },
  stagedGifImage: { width: '100%', height: '100%' },
  stagedGifRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
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
    alignSelf: 'center',
  },
  sendBtnQuiet: { backgroundColor: 'transparent' },
});
