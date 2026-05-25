import { StyleSheet, Text, View } from 'react-native';

import { HouseIllustration } from '@/components/home/house-illustration';
import { Colors, FontFamily, Radius, TextStyle } from '@/constants/theme';

type Props = {
  /** Optional override; the tile is fixed-height 122 in its design. */
  height?: number;
};

// Pure visual of the House Rules home tile — no Pressable, no animations.
// Shared between the live tile (`HouseRulesTile`, which adds interactivity +
// badge wobble) and the close-morph in `app/house-rules.tsx` (which paints
// this inside the shrinking rect so the tile becomes visible the moment the
// morph reaches its landing position).
export const TILE_HEIGHT = 122;

const HOUSE_LEFT = 4;
const HOUSE_TOP = 12;
const HOUSE_WIDTH = 102;
const HOUSE_HEIGHT = 94;
const TEXT_LEFT = 120;

export function HouseRulesTileVisual({ height = TILE_HEIGHT }: Props) {
  return (
    <View style={[styles.tile, { height }]}>
      {/* House illustration */}
      <View style={styles.houseWrap} pointerEvents="none">
        <HouseIllustration width={HOUSE_WIDTH} height={HOUSE_HEIGHT} color={Colors.skyBlue} />
      </View>

      {/* Title + subtitle */}
      <View style={styles.textBlock} pointerEvents="none">
        <Text style={styles.title}>House Rules</Text>
        <Text style={styles.subtitle}>TLDR: don&apos;t be shitty</Text>
      </View>

      {/* "Read me" badge — bleeds above the top-left edge, statically rotated. */}
      <View style={styles.badgeWrap} pointerEvents="none">
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Read me</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: Colors.blue,
    borderRadius: Radius.md, // 12
    overflow: 'visible',
  },
  houseWrap: {
    position: 'absolute',
    left: HOUSE_LEFT,
    top: HOUSE_TOP,
    width: HOUSE_WIDTH,
    height: HOUSE_HEIGHT,
  },
  textBlock: {
    position: 'absolute',
    left: TEXT_LEFT,
    top: 35,
    right: 40,
  },
  title: {
    ...TextStyle.h3,
    color: Colors.white,
  },
  subtitle: {
    ...TextStyle.body,
    color: Colors.white,
  },
  badgeWrap: {
    position: 'absolute',
    top: -13,
    left: 7,
  },
  badge: {
    backgroundColor: Colors.magenta,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    transform: [{ rotate: '-5deg' }],
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.black,
    letterSpacing: -0.64,
  },
});
