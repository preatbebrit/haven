import { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/ui/count-badge';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// ── Shared header geometry ──────────────────────────────────────────────────
// Every screen-level header in the app should match these tokens so buttons
// land in the same place and the row height is identical across screens.
export const HEADER_BUTTON_SIZE = 48;
export const HEADER_BUTTON_RADIUS = 20;
export const HEADER_TOP_GAP = Spacing.sm;     // vertical space between safe area and the row
export const HEADER_BOTTOM_GAP = Spacing.md;  // vertical space below the row before content
export const HEADER_HORIZONTAL = Spacing.md;  // matches every flat header in the app
export const HEADER_ROW_HEIGHT = HEADER_BUTTON_SIZE;

// ── Slot types ──────────────────────────────────────────────────────────────
export type AppHeaderSlot =
  | {
      kind: 'icon';
      icon: ReactNode;
      onPress: () => void;
      accessibilityLabel: string;
      /** Show a CountBadge over the top-right of the button. Hidden when 0. */
      badge?: number;
      /** Show a small magenta dot over the top-right (no number). Overrides
       *  `badge` when both are set. */
      dot?: boolean;
    }
  | {
      kind: 'pill';
      label: string;
      icon?: ReactNode;
      onPress: () => void;
      accessibilityLabel: string;
    }
  /** Reserves a 48×48 box so the center slot stays visually centered. */
  | { kind: 'spacer' }
  /** Renders nothing, takes no space. */
  | { kind: 'none' };

export type AppHeaderCenter =
  | { kind: 'title'; title: string }
  | { kind: 'node'; node: ReactNode }
  | { kind: 'none' };

type Props = {
  /**
   * `flat` — the header sits in normal layout flow with safe-area top padding.
   * `overlay` — absolute-positioned, transparent. Used over a hero image
   *   (e.g. ProfileHero) so the row floats over the avatar background.
   */
  variant?: 'flat' | 'overlay';
  left?: AppHeaderSlot;
  center?: AppHeaderCenter;
  right?: AppHeaderSlot;
  /** Tint of icons inside icon-buttons. Defaults to white. */
  iconTint?: string;
  /** Background of icon/pill buttons. Defaults to black. */
  buttonBg?: string;
  /** Optional override for the wrapper. */
  style?: StyleProp<ViewStyle>;
};

// ── Slot renderer ───────────────────────────────────────────────────────────
function Slot({
  slot,
  iconTint,
  buttonBg,
}: {
  slot: AppHeaderSlot | undefined;
  iconTint: string;
  buttonBg: string;
}) {
  const { colors } = useTheme();
  if (!slot || slot.kind === 'none') {
    return null;
  }
  if (slot.kind === 'spacer') {
    return <View style={styles.iconBtnSpacer} />;
  }
  if (slot.kind === 'pill') {
    return (
      <PressableScale
        style={[styles.pillBtn, { backgroundColor: buttonBg }]}
        onPress={slot.onPress}
        accessibilityRole="button"
        accessibilityLabel={slot.accessibilityLabel}
      >
        <Text style={[styles.pillLabel, { color: iconTint }]} numberOfLines={1}>
          {slot.label}
        </Text>
        {slot.icon}
      </PressableScale>
    );
  }
  // 'icon'
  return (
    <View>
      <PressableScale
        style={[styles.iconBtn, { backgroundColor: buttonBg }]}
        onPress={slot.onPress}
        accessibilityRole="button"
        accessibilityLabel={slot.accessibilityLabel}
      >
        {slot.icon}
      </PressableScale>
      {slot.dot ? (
        <View
          style={[styles.dotWrap, { borderColor: colors.backgroundPrimary }]}
          pointerEvents="none"
        />
      ) : slot.badge && slot.badge > 0 ? (
        <View style={styles.badgeWrap} pointerEvents="none">
          <CountBadge count={slot.badge} size="sm" />
        </View>
      ) : null}
    </View>
  );
}

// ── Center renderer ─────────────────────────────────────────────────────────
function Center({
  center,
  titleColor,
}: {
  center: AppHeaderCenter | undefined;
  titleColor: string;
}) {
  if (!center || center.kind === 'none') {
    return <View style={styles.centerFlex} />;
  }
  if (center.kind === 'title') {
    return (
      <View style={styles.centerFlex} pointerEvents="none">
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
          {center.title}
        </Text>
      </View>
    );
  }
  return <View style={styles.centerFlex}>{center.node}</View>;
}

// ── Component ───────────────────────────────────────────────────────────────
export function AppHeader({
  variant = 'flat',
  left,
  center,
  right,
  iconTint,
  buttonBg,
  style,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + HEADER_TOP_GAP;
  const resolvedIconTint = iconTint ?? colors.textPrimaryInverted;
  const resolvedButtonBg = buttonBg ?? colors.buttonPrimary;

  if (variant === 'overlay') {
    return (
      <View
        pointerEvents="box-none"
        style={[styles.overlayWrap, { top: topPad }, style]}
      >
        <View style={styles.row} pointerEvents="box-none">
          <Slot slot={left} iconTint={resolvedIconTint} buttonBg={resolvedButtonBg} />
          <Center center={center} titleColor={colors.textPrimary} />
          <Slot slot={right} iconTint={resolvedIconTint} buttonBg={resolvedButtonBg} />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.flatWrap,
        { paddingTop: topPad, paddingBottom: HEADER_BOTTOM_GAP },
        style,
      ]}
    >
      <View style={styles.row}>
        <Slot slot={left} iconTint={resolvedIconTint} buttonBg={resolvedButtonBg} />
        <Center center={center} titleColor={colors.textPrimary} />
        <Slot slot={right} iconTint={resolvedIconTint} buttonBg={resolvedButtonBg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flatWrap: {
    paddingHorizontal: HEADER_HORIZONTAL,
    backgroundColor: 'transparent',
    // Keep header above the screen content so floating elements (e.g. the
    // chat's member pill that hangs off the bottom edge) aren't clipped by
    // sibling scroll views.
    zIndex: 10,
    elevation: 10,
  },
  overlayWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: HEADER_HORIZONTAL,
    zIndex: 10,
    elevation: 10,
  },
  row: {
    height: HEADER_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
    borderRadius: HEADER_BUTTON_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSpacer: {
    width: HEADER_BUTTON_SIZE,
    height: HEADER_BUTTON_SIZE,
  },
  pillBtn: {
    height: HEADER_BUTTON_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  pillLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
  },
  centerFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  badgeWrap: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  dotWrap: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.magenta,
    borderWidth: 2,
    borderColor: Colors.white,
  },
});
