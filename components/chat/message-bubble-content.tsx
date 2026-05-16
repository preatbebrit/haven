import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { GenderAvatar, getAvatarColors } from '@/components/ui/gender-avatar';
import type { MockChatMessage } from '@/constants/mock-chat';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  message: MockChatMessage;
  isFirstInGroup?: boolean;
};

export function MessageBubbleContent({ message, isFirstInGroup = true }: Props) {
  const { colors } = useTheme();
  if (message.type === 'system-connection' && message.connection) {
    const c = message.connection;
    const { bg, symbol } = getAvatarColors(c.handle);
    return (
      <View style={[styles.connectionCard, { backgroundColor: c.promptColors.bg }]}>
        <View style={styles.connectionCardHeader}>
          <View style={styles.connectionAvatarRing}>
            <GenderAvatar symbol={c.avatarSymbol} size={24} bgColor={bg} symbolColor={symbol} />
          </View>
          <Text style={[styles.connectionHandle, { color: c.promptColors.support }]}>
            @{c.handle}{' '}
            <Text style={styles.connectionPronouns}>({c.pronouns})</Text>
          </Text>
        </View>
        <Text style={[styles.connectionQuestion, { color: c.promptColors.fg }]}>{c.question}</Text>
        <Text style={[styles.connectionAnswer, { color: c.promptColors.support }]}>{c.answer}</Text>
      </View>
    );
  }

  const hasText = message.body.trim().length > 0;

  if (message.authorId === 'me') {
    const shape = isFirstInGroup ? styles.bubbleMeFirst : styles.bubbleMeContinuation;
    return (
      <View style={styles.bubbleMeWrap}>
        {message.gif && (
          <ExpoImage
            source={{ uri: message.gif.url }}
            style={[styles.bubbleMeGif, hasText && { marginBottom: 4 }]}
            contentFit="cover"
            accessibilityLabel={`GIF: ${message.gif.title}`}
          />
        )}
        {hasText && (
          <View style={[styles.bubbleMe, shape, { backgroundColor: colors.chatBlue }]}>
            <Text style={[styles.bubbleMeText, { color: colors.textPrimaryInverted }]}>{message.body}</Text>
          </View>
        )}
      </View>
    );
  }

  const shape = isFirstInGroup ? styles.bubbleThemFirst : styles.bubbleThemContinuation;
  return (
    <View style={styles.bubbleThemWrap}>
      {message.gif && (
        <ExpoImage
          source={{ uri: message.gif.url }}
          style={[styles.bubbleThemGif, hasText && { marginBottom: 4 }]}
          contentFit="cover"
          accessibilityLabel={`GIF: ${message.gif.title}`}
        />
      )}
      {hasText && (
        <View style={[styles.bubbleThem, shape, { backgroundColor: colors.gray100 }]}>
          <Text style={[styles.bubbleThemText, { color: colors.textPrimary }]}>{message.body}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleMeWrap: { alignItems: 'flex-end' },
  bubbleMe: {
    backgroundColor: Colors.blue,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  bubbleMeFirst: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 2,
  },
  bubbleMeContinuation: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 2,
  },
  bubbleMeText: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.white },
  bubbleMeGif: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: Colors.gray100,
    alignSelf: 'flex-end',
  },

  bubbleThemWrap: { alignItems: 'flex-start' },
  bubbleThem: {
    backgroundColor: Colors.gray100,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  bubbleThemFirst: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
  },
  bubbleThemContinuation: {
    borderTopLeftRadius: 2,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 24,
  },
  bubbleThemText: { fontFamily: FontFamily.medium, fontSize: 16, lineHeight: 20, color: Colors.black },
  bubbleThemGif: {
    width: 220,
    height: 220,
    borderRadius: 24,
    backgroundColor: Colors.gray80,
    alignSelf: 'flex-start',
  },

  connectionCard: {
    width: 220,
    height: 246,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    justifyContent: 'flex-start',
    transform: [{ rotate: '-5deg' }],
  },
  connectionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  connectionAvatarRing: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  connectionHandle: { fontFamily: FontFamily.bold, fontSize: 12, lineHeight: 16 },
  connectionPronouns: { fontFamily: FontFamily.regular, fontSize: 12, lineHeight: 16 },
  connectionQuestion: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    lineHeight: 18,
    opacity: 0.75,
  },
  connectionAnswer: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md, lineHeight: 22 },
});
