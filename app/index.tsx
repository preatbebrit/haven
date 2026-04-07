import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';

const googleLogo = require('@/assets/images/google-logo.png');
const havenLogo = require('@/assets/images/haven_logo_black.png');

const SHEET_ANIM_MS = 300;

type AuthProvider = 'apple' | 'google' | 'phone' | 'email';

type AuthOption =
  | { provider: AuthProvider; label: string; ionicon: React.ComponentProps<typeof Ionicons>['name']; image?: never }
  | { provider: AuthProvider; label: string; image: ReturnType<typeof require>; ionicon?: never };

const AUTH_OPTIONS: AuthOption[] = [
  { provider: 'apple',  label: 'with Apple',          ionicon: 'logo-apple' },
  { provider: 'google', label: 'with Google',          image: googleLogo },
  { provider: 'phone',  label: 'with phone number',    ionicon: 'call' },
  { provider: 'email',  label: 'with email address',   ionicon: 'mail' },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const animatingRef = useRef(false);

  const sheetOffscreen = windowHeight;

  const openSheet = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    sheetTranslateY.setValue(sheetOffscreen);
    overlayOpacity.setValue(0);
    setSheetVisible(true);
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: SHEET_ANIM_MS, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 0, duration: SHEET_ANIM_MS, useNativeDriver: true }),
      ]).start(() => { animatingRef.current = false; });
    });
  }, [overlayOpacity, sheetOffscreen, sheetTranslateY]);

  const closeSheet = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Animated.parallel([
      Animated.timing(overlayOpacity, { toValue: 0, duration: SHEET_ANIM_MS, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: sheetOffscreen, duration: SHEET_ANIM_MS, useNativeDriver: true }),
    ]).start(({ finished }) => {
      animatingRef.current = false;
      if (finished) setSheetVisible(false);
    });
  }, [overlayOpacity, sheetOffscreen, sheetTranslateY]);

  function handleAuth(_provider: AuthProvider) {
    router.replace('/onboarding/username');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* Logo */}
      <View style={styles.logoBlock}>
        <Image source={havenLogo} style={styles.logo} resizeMode="contain" accessibilityLabel="h@ven" />
      </View>

      {/* Headline */}
      <View style={styles.headlineWrap}>
        <Text style={styles.headline}>
          <Text style={styles.hExtraBold}>{"We're happy\nyou're here. "}</Text>
          <Text style={styles.hRegular}>{'Building '}</Text>
          <Text style={styles.hSemiBold}>{'queer community'}</Text>
          <Text style={styles.hRegular}>{' is something we all deserve and '}</Text>
          <Text style={styles.hUnderline}>{'need'}</Text>
          <Text style={styles.hRegular}>{'.'}</Text>
        </Text>

        {/* Decorative stars — absolute positioned, bottom-right */}
        <View style={[styles.star, styles.star3]} pointerEvents="none">
          <Ionicons name="star" size={53} color={Colors.skyBlue} />
        </View>
        <View style={[styles.star, styles.star2]} pointerEvents="none">
          <Ionicons name="star" size={47} color={Colors.cherry} />
        </View>
        <View style={[styles.star, styles.star1]} pointerEvents="none">
          <Ionicons name="star" size={25} color={Colors.green} />
        </View>
      </View>

      {/* Begin button */}
      <View style={[styles.bottomBlock, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <Pressable
          style={({ pressed }) => [styles.beginButton, pressed && styles.beginButtonPressed]}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="Begin"
        >
          <Text style={styles.beginLabel}>Begin</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </Pressable>
      </View>

      {/* Auth bottom sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        <View style={styles.modalRoot}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} accessibilityLabel="Dismiss">
            <Animated.View
              style={[
                StyleSheet.absoluteFillObject,
                styles.dim,
                {
                  opacity: overlayOpacity.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 0.5],
                  }),
                },
              ]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: Math.max(insets.bottom, Spacing.md),
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.sheetHeaderRow}>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.closeBtnPressed]}
                onPress={closeSheet}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={22} color={Colors.white} />
              </Pressable>
              <Text style={styles.sheetTitle}>Continue</Text>
              <View style={styles.sheetHeaderSpacer} />
            </View>

            <View style={styles.sheetBody}>
              {AUTH_OPTIONS.map((option) => (
                <Pressable
                  key={option.provider}
                  style={({ pressed }) => [styles.authButton, pressed && styles.authButtonPressed]}
                  onPress={() => handleAuth(option.provider)}
                >
                  {option.image ? (
                    <Image source={option.image} style={styles.authIconImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.authIconSlot}>
                      <Ionicons name={option.ionicon} size={22} color={Colors.white} />
                    </View>
                  )}
                  <Text style={styles.authLabel}>{option.label}</Text>
                  <Ionicons name="arrow-forward" size={20} color={Colors.white} />
                </Pressable>
              ))}

              <Text style={styles.sheetLegal}>
                By continuing you agree to the{' '}
                <Text style={styles.sheetLegalEm}>Terms of Service</Text>
                {' '}and{' '}
                <Text style={styles.sheetLegalEm}>Privacy Policy</Text>.
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Logo ──────────────────────────────────────────────────────────────────
  logoBlock: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  logo: {
    height: 28,
    width: 120,
  },

  // ── Headline ──────────────────────────────────────────────────────────────
  headlineWrap: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  headline: {
    fontSize: 64,
    lineHeight: 60,
    letterSpacing: -3.84,
  },
  hExtraBold: {
    fontFamily: FontFamily.extraBold,
    color: Colors.black,
  },
  hRegular: {
    fontFamily: FontFamily.regular,
    color: Colors.black,
  },
  hSemiBold: {
    fontFamily: FontFamily.semiBold,
    color: Colors.black,
  },
  hUnderline: {
    fontFamily: FontFamily.extraLight,
    color: Colors.black,
    textDecorationLine: 'underline',
  },

  // ── Decorative stars ──────────────────────────────────────────────────────
  star: {
    position: 'absolute',
  },
  star1: {
    right: 48,
    bottom: 32,
  },
  star2: {
    right: 16,
    bottom: 64,
  },
  star3: {
    right: 8,
    bottom: 120,
  },

  // ── Begin button ──────────────────────────────────────────────────────────
  bottomBlock: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  beginButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  beginButtonPressed: {
    opacity: 0.85,
  },
  beginLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.white,
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.black,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnPressed: {
    opacity: 0.85,
  },
  sheetTitle: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.black,
  },
  sheetHeaderSpacer: {
    width: 48,
  },
  sheetBody: {
    gap: Spacing.sm,
  },
  authButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.lg,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  authButtonPressed: {
    opacity: 0.8,
  },
  authIconSlot: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIconImage: {
    width: 22,
    height: 22,
    marginLeft: 4,
  },
  authLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.white,
  },
  sheetLegal: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    lineHeight: 18,
    color: Colors.gray40,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  sheetLegalEm: {
    textDecorationLine: 'underline',
    fontFamily: FontFamily.medium,
    color: Colors.gray40,
  },
});
