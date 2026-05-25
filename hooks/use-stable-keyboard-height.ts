import { useEffect, useRef } from 'react';
import { Animated, Easing, Keyboard, Platform, type KeyboardEvent } from 'react-native';

// Returns an Animated.Value tracking the keyboard height, captured once when
// the keyboard opens and held steady until it closes. iOS's QuickType /
// autocorrect bar fires frame-change events as the user types — those are
// deliberately ignored here so a footer pinned to this value doesn't jitter
// per keystroke (the issue RN's built-in KeyboardAvoidingView has).
//
// Hardware-keyboard trade-off: if the user toggles between software and
// hardware keyboards mid-session, the height won't update until they dismiss
// and reopen. Acceptable for auth/onboarding flows.
export function useStableKeyboardHeight(): Animated.Value {
  const height = useRef(new Animated.Value(0)).current;
  // Tracks whether the keyboard is currently open, so we know to ignore
  // subsequent frame events.
  const openRef = useRef(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const animateTo = (toValue: number, e?: KeyboardEvent) => {
      const duration = e?.duration && e.duration > 0 ? e.duration : 250;
      Animated.timing(height, {
        toValue,
        duration,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    };

    const onShow = (e: KeyboardEvent) => {
      if (openRef.current) return;
      openRef.current = true;
      animateTo(e.endCoordinates.height, e);
    };
    const onHide = (e: KeyboardEvent) => {
      openRef.current = false;
      animateTo(0, e);
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [height]);

  return height;
}
