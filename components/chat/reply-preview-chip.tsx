import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { type MockChatMessage } from '@/constants/mock-chat';
import { getChatUserByHandle } from '@/constants/mock-chat-content';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  parent: MockChatMessage;
  onClear?: () => void;
  onPress?: () => void;
};

function authorLabel(parent: MockChatMessage): string {
  if (parent.authorId === 'me') return 'You';
  if (parent.type === 'system-connection' && parent.connection) {
    return `@${parent.connection.handle}`;
  }
  const member = getChatUserByHandle(parent.authorId);
  return `@${member?.handle ?? parent.authorId}`;
}

function previewText(parent: MockChatMessage): string {
  const body = parent.body?.trim();
  if (body) return body;
  if (parent.gif) return `GIF · ${parent.gif.title}`;
  return '';
}

// ── Card-style preview for system-connection parents ───────────────────────
// Matches the inline connection card visually (avatar + handle/pronouns +
// question + answer over the prompt's bg color), shrunk to fit a chip slot.
function ConnectionPreview({ parent }: { parent: MockChatMessage }) {
  if (parent.type !== 'system-connection' || !parent.connection) return null;
  const c = parent.connection;
  const { bg: avatarBg, symbol: avatarSym } = getAvatarColors(c.handle);
  return (
    <View style={[connStyles.card, { backgroundColor: c.promptColors.bg }]}>
      <View style={connStyles.headerRow}>
        <View style={connStyles.avatarRing}>
          <GenderAvatar
            symbol={c.avatarSymbol}
            size={20}
            bgColor={avatarBg}
            symbolColor={avatarSym}
          />
        </View>
        <Text style={[connStyles.handle, { color: c.promptColors.support }]} numberOfLines={1}>
          @{c.handle}
          {c.pronouns ? (
            <Text style={connStyles.pronouns}> ({c.pronouns})</Text>
          ) : null}
        </Text>
      </View>
      <Text style={[connStyles.question, { color: c.promptColors.fg }]} numberOfLines={2}>
        {c.question}
      </Text>
      <Text style={[connStyles.answer, { color: c.promptColors.support }]} numberOfLines={3}>
        {c.answer}
      </Text>
    </View>
  );
}

export function ReplyPreviewChip({ parent, onClear, onPress }: Props) {
  const { colors } = useTheme();
  const isConnection = parent.type === 'system-connection' && !!parent.connection;

  // ── Card mode: render the whole answer card preview ─────────────────────
  if (isConnection) {
    const card = (
      <View style={styles.cardWrap}>
        <ConnectionPreview parent={parent} />
        {onClear && (
          <Pressable
            onPress={onClear}
            style={styles.cardClearBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear reply"
          >
            <CloseIcon size={14} color={Colors.white} />
          </Pressable>
        )}
      </View>
    );
    if (onPress) {
      return (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`Jump to ${authorLabel(parent)}'s shared answer`}
        >
          {card}
        </Pressable>
      );
    }
    return card;
  }

  // ── Default mode: compact text chip ─────────────────────────────────────
  const inner = (
    <>
      <View style={[styles.accent, { backgroundColor: colors.chatBlue }]} />
      {parent.gif && (
        <ExpoImage source={{ uri: parent.gif.url }} style={styles.gifThumb} contentFit="cover" />
      )}
      <View style={styles.textCol}>
        <Text style={[styles.author, { color: colors.chatBlue }]} numberOfLines={1}>
          {authorLabel(parent)}
        </Text>
        <Text style={[styles.body, { color: colors.textPrimary }]} numberOfLines={2}>
          {previewText(parent)}
        </Text>
      </View>
      {onClear && (
        <Pressable
          onPress={onClear}
          style={styles.clearBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Clear reply"
        >
          <CloseIcon size={14} color={Colors.white} />
        </Pressable>
      )}
    </>
  );
  const rootStyle = [styles.root, { backgroundColor: colors.gray100 }];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [rootStyle, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={`Jump to ${authorLabel(parent)}'s message`}
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={rootStyle}>{inner}</View>;
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.gray100,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  accent: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: Colors.blue,
  },
  gifThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: Colors.gray80,
  },
  textCol: { flex: 1, minWidth: 0 },
  author: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.blue,
    letterSpacing: -0.24,
  },
  body: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    lineHeight: 17,
    color: Colors.gray20,
    marginTop: 1,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Card mode wrappers ────────────────────────────────────────────────
  cardWrap: {
    position: 'relative',
  },
  cardClearBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const connStyles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    padding: Spacing.sm + 2,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarRing: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  handle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: -0.22,
  },
  pronouns: {
    fontFamily: FontFamily.medium,
  },
  question: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
  },
  answer: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
  },
});
