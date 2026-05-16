import { Image as ExpoImage } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type GalleryItem = string | null;

type Props = {
  /** URIs (or null for empty placeholders). For phase 5 friend profiles, this is mock-driven. */
  items: GalleryItem[];
  ownerHandle: string;
  /**
   * If provided, filled tiles become tappable. The index passed is the index
   * in the filled photo list — i.e. the index the consumer should pass to a
   * fullscreen viewer to start at the correct photo.
   */
  onPressItem?: (photoIndex: number) => void;
};

/**
 * Read-only gallery grid for friend profiles.
 * Same 3-column layout as the editable gallery on the own-profile screen, but
 * non-interactive and without empty slots — only photos the user has actually
 * shared are rendered.
 */
export function ProfileGallerySection({ items, ownerHandle, onPressItem }: Props) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const slotSize = (width - Spacing.md * 2 - 8 * 2) / 3;
  const filled = items.filter((u): u is string => Boolean(u));

  if (filled.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No photos shared yet</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          @{ownerHandle} hasn’t added any photos yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {filled.map((uri, i) => {
        const tileStyle = [styles.filled, { width: slotSize, height: slotSize, backgroundColor: colors.gray100 }];
        const image = <ExpoImage source={{ uri }} style={styles.image} contentFit="cover" />;
        if (onPressItem) {
          return (
            <Pressable
              key={`${i}-${uri}`}
              onPress={() => onPressItem(i)}
              style={({ pressed }) => [...tileStyle, pressed && { opacity: 0.85 }]}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1}`}
            >
              {image}
            </Pressable>
          );
        }
        return (
          <View key={`${i}-${uri}`} style={tileStyle}>
            {image}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: Spacing.sm,
  },
  filled: {
    borderRadius: Radius.sm,
    overflow: 'hidden',
    backgroundColor: Colors.gray100,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  emptyState: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
    textAlign: 'center',
  },
  emptyBody: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.gray40,
    textAlign: 'center',
  },
});
