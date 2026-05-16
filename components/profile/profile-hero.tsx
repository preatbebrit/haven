import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import {
  AppHeader,
  type AppHeaderSlot,
} from '@/components/ui/app-header';
import { GenderAvatar, getAvatarColors, type GenderSymbol } from '@/components/ui/gender-avatar';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type HeroTrailing =
  | { kind: 'settings'; onPress: () => void }
  | { kind: 'icon'; node: React.ReactNode; onPress: () => void; accessibilityLabel: string }
  | {
      kind: 'pill';
      label: string;
      icon: React.ReactNode;
      onPress: () => void;
      accessibilityLabel: string;
    }
  | { kind: 'none' };

type Props = {
  avatarSymbol: GenderSymbol;
  /** Seed for `getAvatarColors` — typically the user's handle. */
  seed: string;
  onBack: () => void;
  trailing: HeroTrailing;
  /**
   * When true, skips rendering the AppHeader. Use this when the parent screen
   * needs to position the back/trailing buttons separately (e.g. so they
   * don't scale with the hero during overscroll).
   */
  headerless?: boolean;
};

function trailingToSlot(trailing: HeroTrailing): AppHeaderSlot {
  switch (trailing.kind) {
    case 'none':
      return { kind: 'spacer' };
    case 'settings':
      return {
        kind: 'icon',
        icon: <Ionicons name="settings-outline" size={22} color={Colors.white} />,
        onPress: trailing.onPress,
        accessibilityLabel: 'Settings',
      };
    case 'icon':
      return {
        kind: 'icon',
        icon: trailing.node,
        onPress: trailing.onPress,
        accessibilityLabel: trailing.accessibilityLabel,
      };
    case 'pill':
      return {
        kind: 'pill',
        label: trailing.label,
        icon: trailing.icon,
        onPress: trailing.onPress,
        accessibilityLabel: trailing.accessibilityLabel,
      };
  }
}

export function ProfileHero({ avatarSymbol, seed, onBack, trailing, headerless }: Props) {
  const { colors } = useTheme();
  const { bg, symbol } = getAvatarColors(seed);

  return (
    <View style={[styles.hero, { backgroundColor: colors.backgroundPrimary }]}>
      <View style={styles.heroAvatarWrap}>
        <GenderAvatar symbol={avatarSymbol} size={320} bgColor={bg} symbolColor={symbol} />
      </View>
      {headerless ? null : (
        <AppHeader
          variant="overlay"
          left={{
            kind: 'icon',
            icon: <Ionicons name="arrow-back" size={20} color={colors.textPrimaryInverted} />,
            onPress: onBack,
            accessibilityLabel: 'Go back',
          }}
          right={trailingToSlot(trailing)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 300,
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  heroAvatarWrap: {
    position: 'absolute',
    left: -40,
    top: -40,
  },
});
