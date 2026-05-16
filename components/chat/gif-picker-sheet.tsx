import { Image } from 'expo-image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/ui/icons/close-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { MOCK_GIFS, type MockGif } from '@/constants/mock-gifs';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const SHEET_OPEN = { duration: 280, easing: Easing.out(Easing.cubic) } as const;
const SHEET_CLOSE = { duration: 260, easing: Easing.in(Easing.cubic) } as const;
const SHEET_SNAP = { duration: 200, easing: Easing.out(Easing.quad) } as const;

const SHEET_HEIGHT_RATIO = 0.72;

export function GifPickerSheet({
  onSelect,
  onClose,
}: {
  onSelect: (gif: MockGif) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const sheetHeight = windowHeight * SHEET_HEIGHT_RATIO;
  const [query, setQuery] = useState('');

  const translateY = useSharedValue(sheetHeight + 60);
  const overlayOpacity = useSharedValue(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    translateY.value = withTiming(0, SHEET_OPEN);
    overlayOpacity.value = withTiming(1, { duration: 220 });
  }, []);

  const handleClose = useCallback(() => {
    const closeCb = onCloseRef.current;
    translateY.value = withTiming(sheetHeight + 60, SHEET_CLOSE, (done) => {
      'worklet';
      if (done) runOnJS(closeCb)();
    });
    overlayOpacity.value = withTiming(0, { duration: 220 });
  }, [sheetHeight]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.value = g.dy;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.8) handleClose();
        else translateY.value = withTiming(0, SHEET_SNAP);
      },
    }),
  ).current;

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_GIFS;
    return MOCK_GIFS.filter(
      (g) => g.title.toLowerCase().includes(q) || g.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  const GRID_GAP = 8;
  const GRID_PADDING = Spacing.md;
  const tileSize = (windowWidth - GRID_PADDING * 2 - GRID_GAP) / 2;

  const renderItem = useCallback(
    ({ item }: { item: MockGif }) => (
      <Pressable
        onPress={() => onSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={`Send ${item.title} GIF`}
        style={({ pressed }) => [
          styles.tile,
          { width: tileSize, height: tileSize },
          pressed && { opacity: 0.7 },
        ]}
      >
        <Image source={{ uri: item.url }} style={styles.tileImage} contentFit="cover" />
      </Pressable>
    ),
    [onSelect, tileSize],
  );

  return (
    <Modal transparent visible onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, styles.dim, overlayStyle]} pointerEvents="none" />
      <View style={styles.modalRoot}>
        <Pressable style={styles.dismissArea} onPress={handleClose} />
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            {
              height: sheetHeight,
              backgroundColor: colors.backgroundPrimary,
              paddingBottom: Math.max(insets.bottom + Spacing.md, 24),
            },
          ]}
          {...panResponder.panHandlers}
        >
          <PressableScale
            style={[styles.closeBtn, { backgroundColor: colors.buttonPrimary }]}
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <CloseIcon size={24} color={colors.textPrimaryInverted} />
          </PressableScale>
          <Text style={[styles.title, { color: colors.textPrimary }]}>GIFs</Text>

          <View style={styles.searchWrap}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search GIFs"
              placeholderTextColor={Colors.gray60}
              style={[
                styles.searchInput,
                { borderColor: colors.gray80, color: colors.textPrimary, backgroundColor: colors.backgroundPrimary },
              ]}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={{ gap: GRID_GAP }}
            ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No GIFs found for &ldquo;{query}&rdquo;</Text>
              </View>
            }
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: 'rgba(0,0,0,0.70)' },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingTop: Spacing.md,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 16,
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 20,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
    marginBottom: Spacing.md,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.md,
    color: Colors.black,
    letterSpacing: -0.32,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  searchWrap: { paddingHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchInput: {
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.gray80,
    paddingHorizontal: Spacing.md,
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  tile: { borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.gray100 },
  tileImage: { width: '100%', height: '100%' },
  empty: { alignItems: 'center', paddingTop: Spacing.xl },
  emptyText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.gray40 },
});
