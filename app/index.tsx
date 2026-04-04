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

import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';

const googleLogo = require('@/assets/images/google-logo.png');

const SHEET_ANIM_MS = 300;

type AuthProvider = 'apple' | 'google' | 'phone' | 'email';

type AuthOption =
  | { provider: AuthProvider; label: string; ionicon: React.ComponentProps<typeof Ionicons>['name']; image?: never }
  | { provider: AuthProvider; label: string; image: ReturnType<typeof require>; ionicon?: never };

const AUTH_OPTIONS: AuthOption[] = [
  { provider: 'apple', label: 'with Apple', ionicon: 'logo-apple' },
  { provider: 'google', label: 'with Google', image: googleLogo },
  { provider: 'phone', label: 'with phone number', ionicon: 'call' },
  { provider: 'email', label: 'with email address', ionicon: 'mail' },
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
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: SHEET_ANIM_MS,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: SHEET_ANIM_MS,
          useNativeDriver: true,
        }),
      ]).start(() => {
        animatingRef.current = false;
      });
    });
  }, [overlayOpacity, sheetOffscreen, sheetTranslateY]);

  const closeSheet = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: SHEET_ANIM_MS,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: sheetOffscreen,
        duration: SHEET_ANIM_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      animatingRef.current = false;
      if (finished) setSheetVisible(false);
    });
  }, [overlayOpacity, sheetOffscreen, sheetTranslateY]);

  function handleAuth(_provider: AuthProvider) {
    // TODO: wire up real auth per provider
    router.replace('/onboarding/username');
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.logoBlock}>
        <Text style={styles.brand} accessibilityRole="header">
          <Text style={styles.brandPlain}>h</Text>
          <Text style={styles.brandAt}>@</Text>
          <Text style={styles.brandPlain}>ven</Text>
        </Text>
      </View>

      <View style={styles.headlineWrap}>
        <Text style={[styles.decor, styles.decor1]}>✦</Text>
        <Text style={[styles.decor, styles.decor2]}>★</Text>
        <Text style={[styles.decor, styles.decor3]}>🌸</Text>
        <Text style={[styles.decor, styles.decor4]}>😊</Text>
        <Text style={[styles.decor, styles.decor5]}>✦</Text>

        <Text style={styles.headline}>
          <Text style={styles.headlineBold}>
            We&apos;re happy{'\n'}you&apos;re here.{' '}
          </Text>
          <Text style={styles.headlineLight}>
            Building queer community is something we all deserve and{' '}
            <Text style={styles.headlineUnderline}>need.</Text>
          </Text>
        </Text>
      </View>

      <View style={styles.bottomBlock}>
        <Pressable
          style={({ pressed }) => [styles.beginButton, pressed && styles.beginButtonPressed]}
          onPress={openSheet}
          accessibilityRole="button"
          accessibilityLabel="Begin"
        >
          <Text style={styles.beginLabel}>Begin</Text>
          <Text style={styles.beginArrow}>→</Text>
        </Pressable>
      </View>

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
                By continuing you agree to the <Text style={styles.sheetLegalEm}>Terms of Service</Text> and{' '}
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
  logoBlock: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  brand: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
    letterSpacing: -0.5,
  },
  brandPlain: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
    color: Colors.black,
  },
  brandAt: {
    fontFamily: FontFamily.extraBold,
    fontSize: FontSize.xl,
    color: Colors.cyan,
  },
  headlineWrap: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    position: 'relative',
  },
  decor: {
    position: 'absolute',
    fontSize: 28,
    zIndex: 0,
  },
  decor1: {
    top: '8%',
    right: '6%',
    fontSize: 22,
    opacity: 0.85,
  },
  decor2: {
    top: '22%',
    left: '4%',
    fontSize: 26,
  },
  decor3: {
    top: '38%',
    right: '10%',
    fontSize: 32,
  },
  decor4: {
    top: '52%',
    right: '4%',
    fontSize: 36,
  },
  decor5: {
    bottom: '18%',
    left: '8%',
    fontSize: 20,
    opacity: 0.9,
  },
  headline: {
    zIndex: 1,
  },
  headlineBold: {
    fontFamily: FontFamily.extraBold,
    fontSize: 36,
    lineHeight: 44,
    color: Colors.black,
    letterSpacing: -0.8,
  },
  headlineLight: {
    fontFamily: FontFamily.medium,
    fontSize: 28,
    lineHeight: 38,
    color: Colors.black,
    letterSpacing: -0.4,
  },
  headlineUnderline: {
    textDecorationLine: 'underline',
    fontFamily: FontFamily.medium,
  },
  bottomBlock: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  beginButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.full,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  beginButtonPressed: {
    opacity: 0.85,
  },
  beginLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.white,
  },
  beginArrow: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.white,
    width: 28,
    textAlign: 'right',
  },
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
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
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: Colors.black,
    letterSpacing: 0.3,
  },
  sheetHeaderSpacer: {
    width: 40,
  },
  sheetBody: {
    gap: Spacing.sm,
  },
  authButton: {
    backgroundColor: Colors.black,
    borderRadius: Radius.full,
    height: 56,
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
    fontSize: FontSize.md,
    color: Colors.white,
  },
  sheetLegal: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.black,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  sheetLegalEm: {
    textDecorationLine: 'underline',
    fontFamily: FontFamily.medium,
  },
});
