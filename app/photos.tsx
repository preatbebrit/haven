import { Image as ExpoImage } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/components/ui/icons/close-icon';
import { PressableScale } from '@/components/ui/pressable-scale';
import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { getGalleryFor } from '@/lib/profile-directory';

/**
 * Full-screen photo viewer. Reads `owner` (handle) + `start` (index) from
 * URL params, pulls the same gallery as the profile screen via getGalleryFor,
 * and renders a horizontal paging ScrollView so users can swipe between photos.
 */
export default function PhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { owner, start } = useLocalSearchParams<{ owner?: string; start?: string }>();

  const photos = getGalleryFor(typeof owner === 'string' ? owner : '');
  const startIndex = clampIndex(parseInt(typeof start === 'string' ? start : '0', 10), photos.length);
  const [pageIndex, setPageIndex] = useState(startIndex);
  const scrollRef = useRef<ScrollView>(null);

  if (photos.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.emptyScreen}>
          <Text style={styles.emptyText}>No photos to show.</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.emptyClose, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Text style={styles.emptyCloseText}>Close</Text>
          </Pressable>
        </View>
      </>
    );
  }

  function handleMomentumEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    const next = Math.round(x / width);
    if (next !== pageIndex) setPageIndex(next);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.screen}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: startIndex * width, y: 0 }}
          onMomentumScrollEnd={handleMomentumEnd}
          decelerationRate="fast"
        >
          {photos.map((uri, i) => (
            <View key={`${i}-${uri}`} style={{ width, height, justifyContent: 'center' }}>
              <ExpoImage source={{ uri }} style={styles.image} contentFit="contain" />
            </View>
          ))}
        </ScrollView>

        <PressableScale
          onPress={() => router.back()}
          style={[styles.closeBtn, { top: insets.top + Spacing.sm }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close photo viewer"
        >
          <CloseIcon size={24} color={Colors.white} />
        </PressableScale>

        {photos.length > 1 ? (
          <View style={[styles.counter, { bottom: insets.bottom + Spacing.lg }]}>
            <Text style={styles.counterText}>
              {pageIndex + 1} / {photos.length}
            </Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

function clampIndex(value: number, length: number): number {
  if (!Number.isFinite(value) || length === 0) return 0;
  if (value < 0) return 0;
  if (value > length - 1) return length - 1;
  return value;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    left: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  counterText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    lineHeight: 16,
    color: Colors.white,
  },
  emptyScreen: {
    flex: 1,
    backgroundColor: Colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.white,
  },
  emptyClose: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: Colors.white,
  },
  emptyCloseText: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.black,
  },
});
