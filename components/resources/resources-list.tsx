import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { SUPPORT_RESOURCES } from '@/constants/resources';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  style?: ViewStyle;
};

async function openLink(url: string) {
  if (process.env.EXPO_OS === 'web') {
    if (typeof window !== 'undefined') window.open(url, '_blank');
    return;
  }
  await openBrowserAsync(url, {
    presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
  });
}

export function ResourcesList({ style }: Props) {
  const { colors } = useTheme();
  return (
    <View style={style}>
      {SUPPORT_RESOURCES.map((r, i) => (
        <View key={r.url} style={i === 0 ? null : styles.entrySpacing}>
          <Pressable
            onPress={() => openLink(r.url)}
            accessibilityRole="link"
            accessibilityLabel={r.name}
            hitSlop={6}
          >
            {({ pressed }) => (
              <Text
                style={[
                  styles.link,
                  { color: colors.chatBlue },
                  pressed && styles.linkPressed,
                ]}
              >
                {r.name}
              </Text>
            )}
          </Pressable>
          {r.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {r.description}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  entrySpacing: { marginTop: Spacing.md },
  link: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.blue,
    textDecorationLine: 'underline',
  },
  linkPressed: { opacity: 0.6 },
  description: {
    marginTop: Spacing.xs,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.gray40,
  },
});
