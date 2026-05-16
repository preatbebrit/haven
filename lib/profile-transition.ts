import { useSyncExternalStore } from 'react';

import type { GenderSymbol } from '@/components/ui/gender-avatar';

export type Rect = { x: number; y: number; width: number; height: number };
export type ProfileTransitionSource = {
  rect: Rect;
  username: string;
  /** Seed for getAvatarColors — typically the member's id. */
  seed: string;
  avatarSymbol: GenderSymbol;
  bg: string;
  symbol: string;
  /**
   * True when the source rect is inside a transient container (e.g. a bottom
   * sheet that closes when the user taps in). On back, the morph can't land
   * on the original tile — fade out instead.
   */
  transient?: boolean;
} | null;

let current: ProfileTransitionSource = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setProfileTransitionSource(source: ProfileTransitionSource): void {
  current = source;
  emit();
}

export function getProfileTransitionSource(): ProfileTransitionSource {
  return current;
}

export function clearProfileTransitionSource(): void {
  if (current === null) return;
  current = null;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useProfileTransitionSource(): ProfileTransitionSource {
  return useSyncExternalStore(subscribe, getProfileTransitionSource, getProfileTransitionSource);
}
