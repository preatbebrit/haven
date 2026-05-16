import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';

import { useSplashDone } from '@/components/splash/splash-context';
import { CloseIcon } from '@/components/ui/icons/close-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { useActiveChat } from '@/contexts/active-chat-context';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';

// 5-pointed star polygon in a 100×100 viewBox (center 50,50, outer R=45, inner r≈17.2).
const STAR_POINTS = '50,5 60.1,36.1 92.8,36.1 66.4,55.3 76.5,86.4 50,67.2 23.5,86.4 33.6,55.3 7.2,36.1 39.9,36.1';

function NeonStar({ size, fill, stroke }: { size: number; fill: string; stroke: string }) {
  return (
    <Svg width={size} height={size} viewBox="-8 -8 116 116">
      <Polygon points={STAR_POINTS} fill={fill} stroke={stroke} strokeWidth={5} strokeLinejoin="miter" />
    </Svg>
  );
}

// Staggered pop-in for decorative assets — held at scale 0 until `start` flips
// true (after the splash overlay finishes), then springs in with a tiny
// overshoot. `tilt` adds a wobble that resolves to 0° for the stars.
function PopIn({
  start,
  delay,
  tilt = 0,
  style,
  children,
}: {
  start: boolean;
  delay: number;
  tilt?: number;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const rotation = useSharedValue(tilt);

  useEffect(() => {
    if (!start) return;
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 9, stiffness: 140, mass: 0.6 }),
    );
    rotation.value = withDelay(
      delay,
      withSpring(0, { damping: 7, stiffness: 110, mass: 0.6 }),
    );
  }, [start, delay, opacity, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
  }));

  return (
    <Reanimated.View style={[style, animatedStyle]} pointerEvents="none">
      {children}
    </Reanimated.View>
  );
}

const googleLogo = require('@/assets/images/google-logo.png');
const havenLogo = require('@/assets/images/haven_logo_black.png');
const faceImage = require('@/assets/images/face.png');
const flowerImage = require('@/assets/images/flower.png');
const sunImage = require('@/assets/images/sun.png');

// Pops in like PopIn, then spins forever once it settles.
function SunPopIn({
  start,
  delay,
  style,
  children,
}: {
  start: boolean;
  delay: number;
  style?: any;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const popRotation = useSharedValue(-30);
  const loopRotation = useSharedValue(0);

  useEffect(() => {
    if (!start) return;
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 9, stiffness: 140, mass: 0.6 }),
    );
    popRotation.value = withDelay(
      delay,
      withSpring(0, { damping: 7, stiffness: 110, mass: 0.6 }),
    );
    loopRotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(360, { duration: 14000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
    return () => {
      cancelAnimation(loopRotation);
    };
  }, [start, delay, opacity, scale, popRotation, loopRotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { rotate: `${popRotation.value + loopRotation.value}deg` },
    ],
  }));

  return (
    <Reanimated.View style={[style, animatedStyle]} pointerEvents="none">
      {children}
    </Reanimated.View>
  );
}

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
  const splashDone = useSplashDone();
  const { colors, theme } = useTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const animatingRef = useRef(false);

  // Boot router: signed-out users see the welcome screen. Signed-in users
  // without a completed profile go to onboarding; with a profile they land in
  // tabs (or /chat if there's an active one).
  const { isHydrated, activeChatId } = useActiveChat();
  const { loading: authLoading, session, profileUsername } = useAuth();
  const [bootResolved, setBootResolved] = useState(false);

  useEffect(() => {
    if (authLoading || !isHydrated || profileUsername === undefined) return;
    if (!session) {
      setBootResolved(true);
      return;
    }
    if (!profileUsername) {
      router.replace('/onboarding');
      return;
    }
    if (activeChatId) {
      router.replace('/chat');
      return;
    }
    router.replace('/(tabs)/chat-selection');
  }, [authLoading, session, profileUsername, isHydrated, activeChatId, router]);

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

  if (!bootResolved) return null;

  function handleAuth(provider: AuthProvider) {
    if (provider === 'email') {
      router.push('/auth/email');
      return;
    }
    // Apple, Google, and phone OTP ship in a later phase (requires EAS Build
    // for native sign-in flows, and Twilio config for SMS).
    Alert.alert('Coming soon', 'This sign-in option will be available in a future update.');
  }

  const textColor = colors.textPrimary;
  const logoTint = theme === 'dark' ? colors.textPrimary : undefined;

  return (
    <View style={[styles.screen, { backgroundColor: colors.backgroundPrimary, paddingTop: insets.top }]}>

      {/* Sun — corner accent, animates in last and rotates on a loop */}
      <SunPopIn
        start={splashDone}
        delay={820}
        style={[styles.sun, { top: insets.top + Spacing.md + 24 }]}
      >
        <Image
          source={sunImage}
          style={styles.fillParent}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </SunPopIn>

      {/* Logo */}
      <View style={styles.logoBlock}>
        <Image
          source={havenLogo}
          style={[styles.logo, logoTint ? { tintColor: logoTint } : null]}
          resizeMode="contain"
          accessibilityLabel="h@ven"
        />
      </View>

      {/* Headline */}
      <View style={styles.headlineWrap}>
        <Text style={styles.headline}>
          <Text style={[styles.hExtraBold, { color: textColor }]}>{"We’re happy\nyou’re here. "}</Text>
          <Text style={[styles.hRegular, { color: textColor }]}>{'Building '}</Text>
          <Text style={[styles.hSemiBold, { color: textColor }]}>{'queer community'}</Text>
          <Text style={[styles.hRegular, { color: textColor }]}>{' is something we all deserve and '}</Text>
          <Text style={[styles.hUnderline, { color: textColor }]}>{'need'}</Text>
          <Text style={[styles.hRegular, { color: textColor }]}>{'.'}</Text>
        </Text>

        {/* Decorative portrait + flower inline with "queer community" */}
        <PopIn start={splashDone} delay={660} style={styles.faceImage}>
          <Image
            source={faceImage}
            style={styles.fillParent}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </PopIn>
        <PopIn start={splashDone} delay={540} tilt={-8} style={styles.flowerImage}>
          <Image
            source={flowerImage}
            style={styles.fillParent}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
          />
        </PopIn>

        {/* Decorative stars — fill + stroke match Figma node 174:6136 */}
        <PopIn start={splashDone} delay={420} tilt={-18} style={[styles.star, styles.star3]}>
          <NeonStar size={68} fill={Colors.blue} stroke={Colors.magenta} />
        </PopIn>
        <PopIn start={splashDone} delay={260} tilt={20} style={[styles.star, styles.star2]}>
          <NeonStar size={54} fill={Colors.magenta} stroke={Colors.teal} />
        </PopIn>
        <PopIn start={splashDone} delay={120} tilt={-25} style={[styles.star, styles.star1]}>
          <NeonStar size={40} fill={Colors.green} stroke={Colors.lightPurple} />
        </PopIn>
      </View>

      {/* Begin button */}
      <View style={[styles.bottomBlock, { paddingBottom: Math.max(insets.bottom, Spacing.lg) }]}>
        <PressableScale
          style={[styles.beginButton, { backgroundColor: colors.buttonPrimary }]}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="Begin"
        >
          <View style={styles.beginIconSlot} />
          <Text style={[styles.beginLabel, { color: colors.textPrimaryInverted }]}>Begin</Text>
          <View style={styles.beginIconSlot}>
            <Ionicons name="arrow-forward" size={20} color={colors.textPrimaryInverted} />
          </View>
        </PressableScale>
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
                    outputRange: [0, 0.7],
                  }),
                },
              ]}
            />
          </Pressable>

          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: colors.backgroundPrimary,
                paddingBottom: Math.max(insets.bottom + Spacing.md, 54),
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <PressableScale
              style={[styles.closeBtn, { backgroundColor: colors.buttonPrimary }]}
              onPress={closeSheet}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <CloseIcon size={24} color={colors.textPrimaryInverted} />
            </PressableScale>

            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Continue</Text>

            <View style={styles.sheetBody}>
              {AUTH_OPTIONS.map((option) => (
                <PressableScale
                  key={option.provider}
                  style={[styles.authButton, { backgroundColor: colors.buttonPrimary }]}
                  onPress={() => handleAuth(option.provider)}
                >
                  {option.image ? (
                    <Image
                      source={option.image}
                      style={[styles.authIconImage, { tintColor: colors.textPrimaryInverted }]}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.authIconSlot}>
                      <Ionicons name={option.ionicon} size={22} color={colors.textPrimaryInverted} />
                    </View>
                  )}
                  <Text style={[styles.authLabel, { color: colors.textPrimaryInverted }]}>{option.label}</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.textPrimaryInverted} />
                </PressableScale>
              ))}
            </View>

            <Text style={[styles.sheetLegal, { color: colors.textPrimary }]}>
              By continuing you agree to the{' '}
              <Text style={[styles.sheetLegalEm, { color: colors.textPrimary }]}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={[styles.sheetLegalEm, { color: colors.textPrimary }]}>Privacy Policy</Text>.
            </Text>
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
    height: 40,
    width: 120,
  },

  // ── Headline ──────────────────────────────────────────────────────────────
  headlineWrap: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 64,
    lineHeight: 64,
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

  // ── Sun corner accent ─────────────────────────────────────────────────────
  sun: {
    position: 'absolute',
    left: Spacing.md + 8,
    width: 72,
    height: 72,
  },

  // ── Decorative overlays (portrait + flower) ───────────────────────────────
  // Right-anchored so they track the screen edge across device widths.
  // In Figma (node 174:6136) the flower sits flush to the right edge.
  faceImage: {
    position: 'absolute',
    top: 216,
    right: 80,
    width: 70,
    height: 93,
  },
  flowerImage: {
    position: 'absolute',
    top: 235,
    right: -Spacing.md,
    width: 82,
    height: 133,
  },
  fillParent: {
    width: '100%',
    height: '100%',
  },

  // ── Decorative stars ──────────────────────────────────────────────────────
  star: {
    position: 'absolute',
  },
  star1: {
    right: 76,
    bottom: 36,
  },
  star2: {
    right: 12,
    bottom: 72,
  },
  star3: {
    right: -24,
    bottom: 136,
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
  beginLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    lineHeight: 20,
    color: Colors.white,
  },
  beginIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 16,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.black,
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
  },
  authIconSlot: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authIconImage: {
    width: 22,
    height: 22,
  },
  authLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
    color: Colors.white,
  },
  sheetLegal: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.black,
    textAlign: 'center',
  },
  sheetLegalEm: {
    textDecorationLine: 'underline',
    fontFamily: FontFamily.semiBold,
    color: Colors.black,
  },
});
