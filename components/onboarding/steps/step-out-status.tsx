import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { ResourcesList } from '@/components/resources/resources-list';
import { CheckIcon } from '@/components/ui/icons/check-icon';
import { useStepFlow } from '@/contexts/step-flow-context';
import { ACCEPTING_ENVIRONMENT_OPTIONS } from '@/constants/onboarding-options';
import { ACCEPTING_ENVIRONMENT_CONCERNING } from '@/constants/resources';
import { useOnboarding } from '@/contexts/onboarding-context';
import { type OutStatus } from '@/lib/profile-display';
import { Colors, FontFamily, FontSize, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Phase = 'out' | 'environment' | 'resources';

const PHASE_ORDER: Phase[] = ['out', 'environment', 'resources'];

// Match the parent onboarding step animation (app/onboarding/index.tsx).
const TRANSITION_MS = 280;
const OUTGOING_OFFSET = 32;

const OUT_OPTIONS: { id: OutStatus; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'sort-of', label: 'Sort-of' },
];

export function StepOutStatus({ isActive }: { isActive: boolean }) {
  const { colors } = useTheme();
  const { setPrimaryButton, setSecondaryButton, setBackHandler, advance } = useStepFlow();
  const { outStatus, setOutStatus, acceptingEnvironment, setAcceptingEnvironment } = useOnboarding();
  const [phase, setPhase] = useState<Phase>('out');
  const [prevPhase, setPrevPhase] = useState<Phase | null>(null);
  const directionRef = useRef<'forward' | 'backward'>('forward');
  const [bodyWidth, setBodyWidth] = useState(0);

  const currTX = useSharedValue(0);
  const currOpacity = useSharedValue(1);
  const prevTX = useSharedValue(0);
  const prevOpacity = useSharedValue(1);

  const goToPhase = useCallback((next: Phase) => {
    setPhase((current) => {
      if (current === next) return current;
      directionRef.current =
        PHASE_ORDER.indexOf(next) > PHASE_ORDER.indexOf(current) ? 'forward' : 'backward';
      setPrevPhase(current);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;

    if (phase === 'resources') {
      setPrimaryButton({
        label: 'Next',
        inactive: false,
        onPress: () => advance(),
      });
      setSecondaryButton(null);
      setBackHandler(() => goToPhase('environment'));
      return;
    }

    if (phase === 'environment') {
      setPrimaryButton({
        label: 'Next',
        inactive: !acceptingEnvironment,
        onPress: () => {
          if (!acceptingEnvironment) return;
          if (ACCEPTING_ENVIRONMENT_CONCERNING.has(acceptingEnvironment)) {
            goToPhase('resources');
            return;
          }
          advance();
        },
      });
      setSecondaryButton(null);
      setBackHandler(() => goToPhase('out'));
      return;
    }

    setPrimaryButton({
      label: 'Next',
      inactive: outStatus === null,
      onPress: () => {
        if (outStatus === null) return;
        goToPhase('environment');
      },
    });
    setSecondaryButton(null);
    setBackHandler(null);
  }, [
    isActive,
    phase,
    outStatus,
    acceptingEnvironment,
    advance,
    goToPhase,
    setAcceptingEnvironment,
    setPrimaryButton,
    setSecondaryButton,
    setBackHandler,
  ]);

  const clearPrev = useCallback(() => setPrevPhase(null), []);

  const runTransition = useCallback(
    (width: number) => {
      if (width === 0) {
        clearPrev();
        return;
      }
      const dir = directionRef.current === 'forward' ? 1 : -1;
      currTX.value = width * dir;
      currOpacity.value = 0;
      prevTX.value = 0;
      prevOpacity.value = 1;

      prevTX.value = withTiming(-OUTGOING_OFFSET * dir, {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
      });
      prevOpacity.value = withTiming(0, {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
      });
      currTX.value = withTiming(0, { duration: TRANSITION_MS, easing: Easing.out(Easing.cubic) });
      currOpacity.value = withTiming(
        1,
        { duration: TRANSITION_MS, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(clearPrev)();
        },
      );
    },
    [clearPrev, currOpacity, currTX, prevOpacity, prevTX],
  );

  useEffect(() => {
    if (prevPhase === null) return;
    runTransition(bodyWidth);
  }, [prevPhase, bodyWidth, runTransition]);

  const currStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: currTX.value }],
    opacity: currOpacity.value,
  }));
  const prevStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: prevTX.value }],
    opacity: prevOpacity.value,
  }));

  const onHostLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== bodyWidth) setBodyWidth(w);
  };

  const renderPhase = (p: Phase) => {
    if (p === 'resources') {
      return (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>Resources</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Before moving forward, check out the resources available to find help.
          </Text>
          <ResourcesList style={styles.resourcesList} />
        </ScrollView>
      );
    }

    if (p === 'environment') {
      return (
        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Are you in an accepting environment?</Text>
          <View style={styles.list}>
            {ACCEPTING_ENVIRONMENT_OPTIONS.map((label) => {
              const selected = acceptingEnvironment === label;
              return (
                <Pressable
                  key={label}
                  style={({ pressed }) => [
                    styles.row,
                    { borderBottomColor: colors.gray80 },
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => setAcceptingEnvironment(label)}
                >
                  <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
                  <View
                    style={[
                      styles.radioOuter,
                      selected && { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary },
                    ]}
                  >
                    {selected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Are you out?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Out — recognizing, accepting, and openly sharing one&apos;s LGBTQ+ orientation or gender
          identity with others.
        </Text>
        <View style={styles.list}>
          {OUT_OPTIONS.map(({ id, label }) => {
            const selected = outStatus === id;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.gray80 },
                  pressed && styles.rowPressed,
                ]}
                onPress={() => setOutStatus(id)}
              >
                <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
                <View
                  style={[
                    styles.radioOuter,
                    selected && { borderColor: colors.buttonPrimary, backgroundColor: colors.buttonPrimary },
                  ]}
                >
                  {selected ? <CheckIcon size={16} color={colors.textPrimaryInverted} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.host} onLayout={onHostLayout}>
      {prevPhase !== null ? (
        <Animated.View style={[styles.layer, styles.layerAbsolute, prevStyle]} pointerEvents="none">
          {renderPhase(prevPhase)}
        </Animated.View>
      ) : null}
      <Animated.View style={[styles.layer, currStyle]}>{renderPhase(phase)}</Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, overflow: 'hidden' },
  layer: { flex: 1 },
  layerAbsolute: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  body: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.lg },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.h1,
    lineHeight: 44,
    letterSpacing: -2.4,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.gray40,
    lineHeight: 20,
    letterSpacing: -0.32,
    marginBottom: Spacing.lg,
  },
  resourcesList: { marginTop: Spacing.xs },
  list: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.gray80,
  },
  rowPressed: { opacity: 0.9 },
  rowLabel: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    flex: 1,
    paddingRight: Spacing.md,
  },
  radioOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Colors.gray60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.black, backgroundColor: Colors.black },
});
