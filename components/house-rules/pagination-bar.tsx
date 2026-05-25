import { StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

type Props = {
  /** Total number of cards in the carousel. */
  count: number;
  /** Currently active card index (0-based). */
  active: number;
};

const ACTIVE_WIDTH = 235.34;
const INACTIVE_WIDTH = 19.415;
const HEIGHT = 4;
const GAP = 4;

// Windowed pagination from Figma 601:12940 — active dash is wide and dark,
// the other dashes are narrow and gray. The active dash visually anchors the
// progress through the deck.
export function PaginationBar({ count, active }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === active;
        return (
          <View
            key={i}
            style={[
              styles.dash,
              {
                width: isActive ? ACTIVE_WIDTH : INACTIVE_WIDTH,
                backgroundColor: isActive ? Colors.black : Colors.gray80,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: GAP,
  },
  dash: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
  },
});
